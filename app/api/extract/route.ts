import { type NextRequest, NextResponse } from "next/server";
import {
  uploadAndExtract,
  processImage,
  saveResult,
} from "@/lib/extraction/pipeline";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imageId,
      method = "llm",
      force = false,
      testMode = false,
      file,
    } = body;

    // Récupérer l'utilisateur depuis les headers du middleware
    const userId = request.headers.get("x-user-id");

    if (!testMode && !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Si on a un fichier, faire upload + extraction
    if (file) {
      // Convertir le fichier base64 en File object
      const fileBuffer = Buffer.from(file.data, "base64");
      const fileObj = new File([fileBuffer], file.name, { type: file.type });

      const result = await uploadAndExtract(
        {
          file: fileObj,
          userId: userId || "test-user",
          originalFilename: file.name,
        },
        { method, force, testMode }
      );

      return NextResponse.json({
        imageId: result.imageId,
        result: result.result,
        cached: result.cached,
      });
    }

    // Sinon, traiter une image existante
    if (!imageId) {
      return NextResponse.json(
        { error: "Image ID or file is required" },
        { status: 400 }
      );
    }

    // Récupérer les informations de l'image depuis la base de données
    const supabase = await createClient();
    const { data: image, error: imageError } = await supabase
      .from("images")
      .select("*")
      .eq("id", imageId)
      .eq("user_id", userId)
      .single();

    if (imageError || !image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Vérifier si une prédiction existe déjà
    if (!testMode && !force) {
      const { data: existingPrediction } = await supabase
        .from("predictions")
        .select("*")
        .eq("image_id", imageId)
        .eq("user_id", userId)
        .single();

      if (existingPrediction) {
        return NextResponse.json({
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
        });
      }
    }

    // Supprimer l'ancienne prédiction si on force
    if (force) {
      await supabase
        .from("predictions")
        .delete()
        .eq("image_id", imageId)
        .eq("user_id", userId);
    }

    // Traiter l'image avec les bonnes informations
    const imageData = {
      id: image.id,
      storage_path: image.storage_path,
      mime_type: image.mime_type,
      user_id: image.user_id,
    };

    const result = await processImage(imageData, method);

    // Sauvegarder le résultat (sauf en mode test)
    if (!testMode && userId) {
      await saveResult(imageId, userId, result);
    }

    return NextResponse.json({
      result,
      cached: false,
    });
  } catch (error) {
    console.error("Extraction API error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";

    if (
      errorMessage.includes("1024 KB") ||
      errorMessage.includes("file size")
    ) {
      return NextResponse.json(
        {
          error:
            "Image file is too large. Please compress the image to under 1MB.",
          details: errorMessage,
        },
        { status: 413 }
      );
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
