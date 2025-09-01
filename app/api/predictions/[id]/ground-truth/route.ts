import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: predictionId } = await params
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
    const { brand, product_family, model_number, serial_number, verification_notes } = body

    // Get prediction to verify it belongs to the user
    const { data: prediction, error: predictionError } = await supabase
      .from("predictions")
      .select("image_id")
      .eq("id", predictionId)
      .eq("user_id", user.id)
      .single()

    if (predictionError || !prediction) {
      return NextResponse.json({ error: "Prediction not found" }, { status: 404 })
    }

    // Upsert ground truth data
    const { data: groundTruth, error: groundTruthError } = await supabase
      .from("ground_truth")
      .upsert(
        {
          image_id: prediction.image_id,
          user_id: user.id,
          brand,
          product_family,
          model_number,
          serial_number,
          verified_by: user.id,
          verification_notes,
          is_verified: true,
        },
        {
          onConflict: "image_id",
        },
      )
      .select()
      .single()

    if (groundTruthError) {
      throw groundTruthError
    }

    return NextResponse.json({
      groundTruth,
      message: "Ground truth saved successfully",
    })
  } catch (error) {
    console.error("Save ground truth API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: predictionId } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get prediction to get image_id
    const { data: prediction, error: predictionError } = await supabase
      .from("predictions")
      .select("image_id")
      .eq("id", predictionId)
      .eq("user_id", user.id)
      .single()

    if (predictionError || !prediction) {
      return NextResponse.json({ error: "Prediction not found" }, { status: 404 })
    }

    // Get ground truth data
    const { data: groundTruth, error: groundTruthError } = await supabase
      .from("ground_truth")
      .select("*")
      .eq("image_id", prediction.image_id)
      .eq("user_id", user.id)
      .single()

    if (groundTruthError && groundTruthError.code !== "PGRST116") {
      throw groundTruthError
    }

    return NextResponse.json({
      groundTruth: groundTruth || null,
    })
  } catch (error) {
    console.error("Get ground truth API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
