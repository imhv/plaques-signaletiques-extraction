import { createClient } from "@/lib/supabase/server";

export interface PredictionData {
  id: string;
  brand?: string;
  product_family?: string;
  model_number?: string;
  serial_number?: string;
  brand_confidence?: number;
  product_family_confidence?: number;
  model_number_confidence?: number;
  serial_number_confidence?: number;
  processing_method: string;
  processing_time_ms: number;
  created_at: string;
  images: {
    id: string;
    original_filename: string;
    storage_path: string;
    uploaded_at: string;
  };
}

export interface PredictionsResponse {
  predictions: PredictionData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Fonction pour normaliser le texte (supprimer accents et mettre en minuscules)
function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
    .toLowerCase();
}

export async function getPredictions(
  options: {
    page?: number;
    limit?: number;
    searchTerm?: string;
    filterMethod?: string;
  } = {}
): Promise<PredictionsResponse> {
  const { page = 1, limit = 20, searchTerm, filterMethod } = options;
  const supabase = await createClient();

  // Vérifier l'authentification
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

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
    .eq("user_id", user.id)
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
    throw new Error(`Failed to fetch predictions: ${error.message}`);
  }

  // Get total count for pagination
  let countQuery = supabase
    .from("predictions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (filterMethod && filterMethod !== "all") {
    countQuery = countQuery.eq("processing_method", filterMethod);
  }

  const { count } = await countQuery;

  // Filtrer par terme de recherche côté serveur avec normalisation
  let filteredPredictions = predictions || [];
  if (searchTerm) {
    const normalizedSearchTerm = normalizeText(searchTerm);
    filteredPredictions = filteredPredictions.filter((prediction) => {
      const normalizedFilename = normalizeText(
        prediction.images.original_filename
      );
      const normalizedBrand = prediction.brand
        ? normalizeText(prediction.brand)
        : "";
      const normalizedModelNumber = prediction.model_number
        ? normalizeText(prediction.model_number)
        : "";
      const normalizedProductFamily = prediction.product_family
        ? normalizeText(prediction.product_family)
        : "";

      return (
        normalizedFilename.includes(normalizedSearchTerm) ||
        normalizedBrand.includes(normalizedSearchTerm) ||
        normalizedModelNumber.includes(normalizedSearchTerm) ||
        normalizedProductFamily.includes(normalizedSearchTerm)
      );
    });
  }

  return {
    predictions: filteredPredictions,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}
