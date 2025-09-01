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
    const { name, description, imageIds } = body

    if (!name || !imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json({ error: "Name and imageIds are required" }, { status: 400 })
    }

    // Create evaluation batch
    const { data: batch, error: batchError } = await supabase
      .from("evaluation_batches")
      .insert({
        user_id: user.id,
        name,
        description,
        total_images: imageIds.length,
        processing_method: "hybrid",
        model_version: "v1.0",
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (batchError) {
      throw batchError
    }

    // Process images in background (simplified for demo)
    // In production, you'd want to use a queue system
    processImagesInBackground(batch.id, imageIds, user.id)

    return NextResponse.json({
      batchId: batch.id,
      status: "processing",
      message: "Batch evaluation started",
    })
  } catch (error) {
    console.error("Batch evaluation API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

async function processImagesInBackground(batchId: string, imageIds: string[], userId: string) {
  try {
    const supabase = await createClient()
    const pipeline = new ExtractionPipeline()

    let processedCount = 0
    const results: any[] = []

    for (const imageId of imageIds) {
      try {
        // Get image data
        const { data: imageData, error: imageError } = await supabase
          .from("images")
          .select("*")
          .eq("id", imageId)
          .eq("user_id", userId)
          .single()

        if (imageError || !imageData) {
          console.error(`Image ${imageId} not found`)
          continue
        }

        // Process image
        const result = await pipeline.processImage({
          id: imageData.id,
          storage_path: imageData.storage_path,
          mime_type: imageData.mime_type,
          user_id: userId,
        })

        // Save prediction
        const predictionId = await pipeline.saveResult(imageId, userId, result)

        // Get ground truth if available
        const { data: groundTruth } = await supabase
          .from("ground_truth")
          .select("*")
          .eq("image_id", imageId)
          .eq("user_id", userId)
          .single()

        // Calculate accuracy if ground truth exists
        let accuracy = null
        if (groundTruth) {
          accuracy = calculateAccuracy(result, groundTruth)
        }

        // Save batch result
        await supabase.from("batch_results").insert({
          batch_id: batchId,
          image_id: imageId,
          prediction_id: predictionId,
          ground_truth_id: groundTruth?.id || null,
          user_id: userId,
          brand_match: accuracy?.brand_match || null,
          product_family_match: accuracy?.product_family_match || null,
          model_number_match: accuracy?.model_number_match || null,
          serial_number_match: accuracy?.serial_number_match || null,
          overall_match: accuracy?.overall_match || null,
          comparison_details: accuracy || null,
        })

        results.push(accuracy)
        processedCount++

        // Update batch progress
        await supabase.from("evaluation_batches").update({ processed_images: processedCount }).eq("id", batchId)
      } catch (error) {
        console.error(`Error processing image ${imageId}:`, error)
      }
    }

    // Calculate overall accuracy
    const validResults = results.filter(Boolean)
    const overallAccuracy = validResults.length > 0 ? calculateOverallAccuracy(validResults) : null

    // Update batch with final results
    await supabase
      .from("evaluation_batches")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        overall_accuracy: overallAccuracy?.overall,
        brand_accuracy: overallAccuracy?.brand,
        product_family_accuracy: overallAccuracy?.product_family,
        model_number_accuracy: overallAccuracy?.model_number,
        serial_number_accuracy: overallAccuracy?.serial_number,
      })
      .eq("id", batchId)
  } catch (error) {
    console.error("Background processing error:", error)

    // Mark batch as failed
    const supabase = await createClient()
    await supabase
      .from("evaluation_batches")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        completed_at: new Date().toISOString(),
      })
      .eq("id", batchId)
  }
}

function calculateAccuracy(prediction: any, groundTruth: any) {
  const brandMatch = prediction.brand?.toLowerCase() === groundTruth.brand?.toLowerCase()
  const productFamilyMatch = prediction.product_family?.toLowerCase() === groundTruth.product_family?.toLowerCase()
  const modelNumberMatch = prediction.model_number?.toLowerCase() === groundTruth.model_number?.toLowerCase()
  const serialNumberMatch = prediction.serial_number?.toLowerCase() === groundTruth.serial_number?.toLowerCase()

  const matches = [brandMatch, productFamilyMatch, modelNumberMatch, serialNumberMatch]
  const overallMatch = matches.every(Boolean)

  return {
    brand_match: brandMatch,
    product_family_match: productFamilyMatch,
    model_number_match: modelNumberMatch,
    serial_number_match: serialNumberMatch,
    overall_match: overallMatch,
  }
}

function calculateOverallAccuracy(results: any[]) {
  const total = results.length

  const brandAccuracy = (results.filter((r) => r.brand_match).length / total) * 100
  const productFamilyAccuracy = (results.filter((r) => r.product_family_match).length / total) * 100
  const modelNumberAccuracy = (results.filter((r) => r.model_number_match).length / total) * 100
  const serialNumberAccuracy = (results.filter((r) => r.serial_number_match).length / total) * 100
  const overallAccuracy = (results.filter((r) => r.overall_match).length / total) * 100

  return {
    overall: overallAccuracy,
    brand: brandAccuracy,
    product_family: productFamilyAccuracy,
    model_number: modelNumberAccuracy,
    serial_number: serialNumberAccuracy,
  }
}
