import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ExtractionPipeline } from "@/lib/extraction"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { imageId } = body

    if (!imageId) {
      return NextResponse.json({ error: "Image ID is required" }, { status: 400 })
    }

    // Get image data from database
    const { data: imageData, error: imageError } = await supabase
      .from("images")
      .select("*")
      .eq("id", imageId)
      .eq("user_id", user.id)
      .single()

    if (imageError || !imageData) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 })
    }

    // Check if prediction already exists
    const { data: existingPrediction } = await supabase
      .from("predictions")
      .select("*")
      .eq("image_id", imageId)
      .eq("user_id", user.id)
      .single()

    if (existingPrediction) {
      return NextResponse.json({
        predictionId: existingPrediction.id,
        result: {
          brand: existingPrediction.brand,
          product_family: existingPrediction.product_family,
          model_number: existingPrediction.model_number,
          serial_number: existingPrediction.serial_number,
          confidence_scores: {
            brand: existingPrediction.brand_confidence,
            product_family: existingPrediction.product_family_confidence,
            model_number: existingPrediction.model_number_confidence,
            serial_number: existingPrediction.serial_number_confidence,
          },
          method: existingPrediction.processing_method,
          processing_time_ms: existingPrediction.processing_time_ms,
        },
        cached: true,
      })
    }

    // Process image through extraction pipeline
    const pipeline = new ExtractionPipeline()
    const result = await pipeline.processImage({
      id: imageData.id,
      storage_path: imageData.storage_path,
      mime_type: imageData.mime_type,
      user_id: user.id,
    })

    // Save prediction to database
    const predictionId = await pipeline.saveResult(imageId, user.id, result)

    return NextResponse.json({
      predictionId,
      result,
      cached: false,
    })
  } catch (error) {
    console.error("Extraction API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
