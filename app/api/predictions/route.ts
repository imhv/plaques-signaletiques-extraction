import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const searchTerm = searchParams.get("searchTerm") || "";
    const filterMethod = searchParams.get("filterMethod") || "all";

    const supabase = await createClient();

    let query = supabase
      .from("predictions")
      .select(
        `
        *,
        images (
          id,
          original_filename,
          storage_path,
          uploaded_at
        )
      `
      )
      .order("created_at", { ascending: false });

    // Appliquer les filtres
    if (filterMethod && filterMethod !== "all") {
      query = query.eq("processing_method", filterMethod);
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: predictions, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch predictions: ${error.message}` },
        { status: 500 }
      );
    }

    // Get total count for pagination
    let countQuery = supabase
      .from("predictions")
      .select("*", { count: "exact", head: true });

    if (filterMethod && filterMethod !== "all") {
      countQuery = countQuery.eq("processing_method", filterMethod);
    }

    const { count } = await countQuery;

    // Filtrer par terme de recherche côté serveur
    let filteredPredictions = predictions || [];
    if (searchTerm) {
      filteredPredictions = filteredPredictions.filter((prediction) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          prediction.images.original_filename
            .toLowerCase()
            .includes(searchLower) ||
          prediction.brand?.toLowerCase().includes(searchLower) ||
          prediction.model_number?.toLowerCase().includes(searchLower) ||
          prediction.product_family?.toLowerCase().includes(searchLower)
        );
      });
    }

    return NextResponse.json({
      predictions: filteredPredictions,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const predictionId = searchParams.get("id");

    if (!predictionId) {
      return NextResponse.json(
        { error: "Prediction ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("predictions")
      .delete()
      .eq("id", predictionId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: `Failed to delete prediction: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
