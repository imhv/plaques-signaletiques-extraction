import { extractWithLLM } from "./llm-extractor";
// import { preprocessImage } from "./image-preprocessor"; // Désactivé - gardé pour usage futur
import type { ExtractionResult, ImageData } from "../types";
import { createClient } from "@/lib/supabase/server";

// Fonction pour supprimer les accents
function removeAccents(str: string | undefined): string | undefined {
  if (!str) return str;
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export interface UploadOptions {
  file: File;
  userId: string;
  originalFilename?: string;
}

export interface ProcessOptions {
  method?: "llm";
  force?: boolean;
  testMode?: boolean;
  model?: string;
  // preprocess?: boolean; // Désactivé - prétraitement retiré
}

// Upload d'image et extraction en une seule méthode
export async function uploadAndExtract(
  options: UploadOptions,
  processOptions: ProcessOptions = {}
): Promise<{ imageId: string; result: ExtractionResult; cached: boolean }> {
  const { file, userId, originalFilename } = options;
  const {
    method = "llm",
    force = false,
    testMode = false,
    model = "gpt-5",
    // preprocess = true, // Désactivé
  } = processOptions;

  // 1. Upload de l'image
  const imageId = await uploadImage(file, userId, originalFilename, testMode);

  // 2. Vérifier si une prédiction existe déjà (sauf en mode test)
  if (!testMode) {
    const existingPrediction = await getExistingPrediction(imageId, userId);
    if (existingPrediction && !force) {
      return {
        imageId,
        result: formatPredictionResult(existingPrediction),
        cached: true,
      };
    }

    // Supprimer l'ancienne prédiction si on force
    if (existingPrediction && force) {
      await deletePrediction(existingPrediction.id, userId);
    }
  }

  // 3. Extraire les informations
  const imageData: ImageData = {
    id: imageId,
    storage_path: testMode ? `${imageId}.jpg` : imageId,
    mime_type: file.type,
    user_id: userId,
  };

  const result = await processImage(imageData, method, model);

  // 4. Sauvegarder le résultat (sauf en mode test)
  if (!testMode) {
    await saveResult(imageId, userId, result);
  }

  return {
    imageId,
    result,
    cached: false,
  };
}

// Upload d'image
async function uploadImage(
  file: File,
  userId: string,
  originalFilename?: string,
  testMode = false
): Promise<string> {
  const supabase = await createClient();
  const bucketName = testMode ? "test-images" : "nameplate-images";

  // Générer un ID unique pour l'image
  const imageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fileExtension = file.name.split(".").pop() || "jpg";
  const storagePath = testMode
    ? `${imageId}.jpg`
    : `${imageId}.${fileExtension}`;

  // Upload vers Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(storagePath, file);

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  // En mode production, sauvegarder les métadonnées en DB
  if (!testMode) {
    const { error: dbError } = await supabase.from("images").insert({
      id: imageId,
      user_id: userId,
      original_filename: originalFilename || file.name,
      storage_path: storagePath,
      mime_type: file.type,
      file_size: file.size,
    });

    if (dbError) {
      throw new Error(`Failed to save image metadata: ${dbError.message}`);
    }
  }

  return imageId;
}

// Récupérer une prédiction existante
async function getExistingPrediction(imageId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("predictions")
    .select("*")
    .eq("image_id", imageId)
    .eq("user_id", userId)
    .single();

  return data;
}

// Supprimer une prédiction
async function deletePrediction(predictionId: string, userId: string) {
  const supabase = await createClient();
  await supabase
    .from("predictions")
    .delete()
    .eq("id", predictionId)
    .eq("user_id", userId);
}

// Formater le résultat d'une prédiction existante
function formatPredictionResult(prediction: any): ExtractionResult {
  return {
    brand: removeAccents(prediction.brand)?.toUpperCase(),
    product_family: prediction.product_family,
    model_number: prediction.model_number
      ?.replace(/\([^)]*\)/g, "")
      .replace(/[-\s.]/g, "")
      .split("/")[0],
    serial_number: prediction.serial_number?.replace(/[-\s.]/g, ""),
    confidence_scores: {
      brand: prediction.brand_confidence,
      product_family: prediction.product_family_confidence,
      model_number: prediction.model_number_confidence,
      serial_number: prediction.serial_number_confidence,
    },
    method: prediction.processing_method as any,
    processing_time_ms: prediction.processing_time_ms,
  };
}

export async function processImage(
  imageData: ImageData,
  method: "llm" = "llm",
  model: string = "gpt-5"
): Promise<ExtractionResult> {
  const startTime = Date.now();

  try {
    // Get signed URL for the image
    const supabase = await createClient();

    // Déterminer le bucket en fonction du contexte
    // Pour les images de test, utiliser le bucket test-images
    const bucketName =
      imageData.user_id === "test-user" ||
      imageData.storage_path.includes("test-")
        ? "test-images"
        : "nameplate-images";

    console.log(
      `Using bucket: ${bucketName} for image: ${imageData.storage_path}`
    );

    const { data: signedUrlData, error: signedUrlError } =
      await supabase.storage
        .from(bucketName)
        .createSignedUrl(imageData.storage_path, 3600); // 1 hour expiry

    if (signedUrlError) {
      console.error("Signed URL error:", signedUrlError);
      throw new Error(`Failed to get signed URL: ${signedUrlError.message}`);
    }

    if (!signedUrlData?.signedUrl) {
      throw new Error("Failed to get signed URL for image");
    }

    const imageUrl = signedUrlData.signedUrl;

    // Utiliser directement l'image originale (prétraitement désactivé)
    console.log(`Processing image ${imageData.id} without preprocessing`);
    const imageToProcess = imageUrl;

    // Utiliser la fonction d'extraction LLM
    const result = await extractWithLLM(imageToProcess, 0, model);

    // Calculer le temps de traitement total
    const totalProcessingTime = Date.now() - startTime;

    return {
      ...result,
      brand: removeAccents(result.brand)?.toUpperCase(),
      model_number: result.model_number
        ?.replace(/\([^)]*\)/g, "")
        .replace(/[-\s.]/g, "")
        .split("/")[0],
      serial_number: result.serial_number?.replace(/[-\s.]/g, ""),
      method: "llm",
      processing_time_ms: totalProcessingTime,
    };
  } catch (error) {
    console.error("Pipeline processing failed:", error);
    throw new Error(
      `Pipeline processing failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function saveResult(
  imageId: string,
  userId: string,
  result: ExtractionResult
): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("predictions")
    .insert({
      image_id: imageId,
      user_id: userId,
      brand: removeAccents(result.brand)?.toUpperCase(),
      product_family: result.product_family?.toUpperCase(),
      model_number: result.model_number
        ?.replace(/\([^)]*\)/g, "")
        .replace(/[-\s.]/g, "")
        .split("/")[0],
      serial_number: result.serial_number?.replace(/[-\s.]/g, ""),
      brand_confidence: result.confidence_scores.brand,
      product_family_confidence: result.confidence_scores.product_family,
      model_number_confidence: result.confidence_scores.model_number,
      serial_number_confidence: result.confidence_scores.serial_number,
      processing_method: result.method,
      processing_time_ms: result.processing_time_ms,
      model_version: "v1.0",
      raw_llm_response: result.raw_data?.llm_response,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to save prediction: ${error.message}`);
  }

  return data.id;
}
