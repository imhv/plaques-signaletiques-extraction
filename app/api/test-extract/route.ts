import { type NextRequest, NextResponse } from "next/server";
import { processImage } from "@/lib/extraction/pipeline";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageId, method = "llm", model = "gpt-5" } = body;
    // const preprocess = true; // Désactivé

    console.log(`Test extraction requested for image: ${imageId}`);

    if (!imageId) {
      return NextResponse.json(
        { error: "Image ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Vérifier d'abord si l'image existe dans le bucket
    console.log(`Checking if ${imageId}.jpg exists in test-images bucket...`);
    const { data: imageData, error: imageError } = await supabase.storage
      .from("test-images")
      .download(`${imageId}.jpg`);

    if (imageError || !imageData) {
      console.error(
        `Image ${imageId}.jpg not found in test-images bucket:`,
        imageError
      );

      // Lister les images disponibles pour debug
      const { data: availableImages } = await supabase.storage
        .from("test-images")
        .list("", { limit: 10 });

      console.log(
        "Available images in bucket:",
        availableImages?.map((img) => img.name)
      );

      return NextResponse.json(
        { error: `Test image ${imageId}.jpg not found` },
        { status: 404 }
      );
    }

    console.log(`Image ${imageId}.jpg found, size: ${imageData.size} bytes`);

    // Traiter l'image avec le pipeline en utilisant l'ID existant
    const result = await processImage(
      {
        id: imageId,
        storage_path: `${imageId}.jpg`, // Chemin dans le bucket test-images
        mime_type: "image/jpeg",
        user_id: "test-user",
      },
      method,
      model
    );

    // Générer l'URL publique de l'image pour l'affichage
    const { data: imageUrl } = supabase.storage
      .from("test-images")
      .getPublicUrl(`${imageId}.jpg`);

    return NextResponse.json({
      result,
      imageUrl: imageUrl.publicUrl,
      cached: false,
    });
  } catch (error) {
    console.error("Test extraction API error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
