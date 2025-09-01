import { createClient } from "@/lib/supabase/server";
import { uploadAndExtract } from "@/lib/extraction/pipeline";

export interface UploadedImage {
  id: string;
  original_filename: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  uploaded_at: string;
  user_id: string;
}

export interface UploadResult {
  imageId: string;
  result: any;
  cached: boolean;
}

export async function uploadAndExtractImage(
  file: File,
  userId: string,
  options: {
    method?: "llm";
    force?: boolean;
  } = {}
): Promise<UploadResult> {
  const result = await uploadAndExtract(
    {
      file,
      userId,
      originalFilename: file.name,
    },
    {
      method: options.method || "llm",
      force: options.force || false,
      testMode: false,
    }
  );

  return {
    imageId: result.imageId,
    result: result.result,
    cached: result.cached,
  };
}

export async function getRecentImages(
  limit: number = 10
): Promise<UploadedImage[]> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: images, error } = await supabase
    .from("images")
    .select("*")
    .eq("user_id", user.id)
    .order("uploaded_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch recent images: ${error.message}`);
  }

  return images || [];
}

export async function deleteImage(imageId: string): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  // Récupérer les informations de l'image
  const { data: image, error: imageError } = await supabase
    .from("images")
    .select("*")
    .eq("id", imageId)
    .eq("user_id", user.id)
    .single();

  if (imageError || !image) {
    throw new Error("Image not found");
  }

  // Supprimer les prédictions associées
  await supabase
    .from("predictions")
    .delete()
    .eq("image_id", imageId)
    .eq("user_id", user.id);

  // Supprimer l'image du storage
  await supabase.storage.from("nameplate-images").remove([image.storage_path]);

  // Supprimer l'enregistrement de la base de données
  const { error: deleteError } = await supabase
    .from("images")
    .delete()
    .eq("id", imageId)
    .eq("user_id", user.id);

  if (deleteError) {
    throw new Error(`Failed to delete image: ${deleteError.message}`);
  }
}
