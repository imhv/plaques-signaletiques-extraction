import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: predictionId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete the prediction (this will only delete if it belongs to the user)
    const { error: deleteError } = await supabase
      .from("predictions")
      .delete()
      .eq("id", predictionId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Delete prediction error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete prediction" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Prediction deleted successfully",
    });
  } catch (error) {
    console.error("Delete prediction API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
