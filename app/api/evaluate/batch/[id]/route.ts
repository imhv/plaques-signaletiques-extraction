import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: batchId } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get batch data
    const { data: batch, error: batchError } = await supabase
      .from("evaluation_batches")
      .select("*")
      .eq("id", batchId)
      .eq("user_id", user.id)
      .single()

    if (batchError || !batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 })
    }

    // Get batch results with related data
    const { data: results, error: resultsError } = await supabase
      .from("batch_results")
      .select(`
        *,
        images (
          id,
          original_filename,
          storage_path
        ),
        predictions (
          id,
          brand,
          product_family,
          model_number,
          serial_number,
          brand_confidence,
          product_family_confidence,
          model_number_confidence,
          serial_number_confidence
        ),
        ground_truth (
          id,
          brand,
          product_family,
          model_number,
          serial_number
        )
      `)
      .eq("batch_id", batchId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })

    if (resultsError) {
      throw resultsError
    }

    return NextResponse.json({
      batch,
      results: results || [],
    })
  } catch (error) {
    console.error("Get batch results API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
