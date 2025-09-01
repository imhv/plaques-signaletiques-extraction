"use server";

export interface ExpectedResult {
  family: string;
  brand: string;
  model: string;
  version: string;
  serialNumber: string;
}

export interface TestPredictionResult {
  id: string;
  filename: string;
  imageUrl?: string; // URL Supabase de l'image originale
  processedImageUrl?: string; // URL de l'image prétraitée
  expected: ExpectedResult;
  actual: {
    family?: string;
    brand?: string;
    model?: string;
    version?: string;
    serialNumber?: string;
  };
  matches: {
    family: boolean;
    brand: boolean;
    model: boolean;
    version: boolean;
    serialNumber: boolean;
  };
  score: number;
  processing_time_ms?: number;
  method?: string;
  timing?: {
    totalTime: number;
    preprocessingTime: number;
    llmTime: number;
    comparisonTime: number;
  };
}

import { expectedResults } from "../../db/expected-test-results";
import { createClient } from "@/lib/supabase/server";

export async function loadExpectedResults(): Promise<
  Map<string, ExpectedResult>
> {
  const results = new Map();

  try {
    // Importer directement le fichier TypeScript

    // Convertir en Map
    Object.entries(expectedResults).forEach(([id, data]) => {
      results.set(id, data as ExpectedResult);
    });

    console.log(`Chargé ${results.size} résultats attendus`);
    return results;
  } catch (error) {
    console.error("Error loading expected results:", error);
    return results;
  }
}

export async function getTestImageIds(): Promise<string[]> {
  try {
    // Prendre directement les IDs depuis expectedResults
    const imageIds = Object.keys(expectedResults);

    console.log(
      `Trouvé ${imageIds.length} IDs d'images avec résultats attendus:`,
      imageIds
    );
    return imageIds;
  } catch (error) {
    console.error("Erreur lors de la récupération des IDs d'images:", error);
    return [];
  }
}

export async function checkImageExistsInSupabase(
  imageId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    // Vérifier si l'image existe dans le bucket en essayant de la télécharger
    const { data, error } = await supabase.storage
      .from("test-images")
      .download(`${imageId}.jpg`);

    if (error) {
      console.error(`Erreur lors de la vérification de ${imageId}.jpg:`, error);
      return false;
    }

    const exists = data !== null;
    console.log(
      `Image ${imageId}.jpg ${exists ? "trouvée" : "non trouvée"} dans Supabase`
    );
    return exists;
  } catch (error) {
    console.error(`Erreur lors de la vérification de ${imageId}.jpg:`, error);
    return false;
  }
}

export async function getAvailableTestImages(): Promise<string[]> {
  try {
    const supabase = await createClient();

    console.log("Listing images in test-images bucket...");

    // Lister toutes les images dans le bucket test-images
    const { data, error } = await supabase.storage
      .from("test-images")
      .list("", {
        limit: 1000, // Limite élevée pour récupérer toutes les images
      });

    if (error) {
      console.error(
        "Erreur lors de la récupération des images de test:",
        error
      );
      return [];
    }

    console.log("Raw bucket data:", data);

    // Extraire les IDs des images (enlever l'extension .jpg)
    const imageIds = data
      .filter((item) => item.name.endsWith(".jpg"))
      .map((item) => item.name.replace(".jpg", ""));

    console.log(
      `Trouvé ${imageIds.length} images dans le bucket test-images:`,
      imageIds.slice(0, 10)
    );
    return imageIds;
  } catch (error) {
    console.error("Erreur lors de la récupération des images de test:", error);
    return [];
  }
}

export async function createRandomSample(count: number): Promise<string[]> {
  try {
    console.log(`Création d'un échantillon aléatoire de ${count} images...`);

    const allImageIds = await getTestImageIds();
    console.log(`IDs d'images disponibles: ${allImageIds.length}`);

    if (allImageIds.length === 0) {
      console.warn("Aucun ID d'image trouvé dans expectedResults");
      return [];
    }

    // Mélange aléatoire et sélection du nombre demandé
    const shuffled = [...allImageIds].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, allImageIds.length));

    console.log(
      `Sélectionné ${selected.length} IDs d'images sur ${allImageIds.length} disponibles:`,
      selected
    );
    return selected;
  } catch (error) {
    console.error("Error creating random sample:", error);
    return [];
  }
}

export async function debugTestImages(): Promise<{
  availableInBucket: string[];
  withExpectedResults: string[];
  validForTesting: string[];
}> {
  try {
    const availableInBucket = await getAvailableTestImages();
    const withExpectedResults = await getTestImageIds();
    const validForTesting = availableInBucket.filter((id) =>
      withExpectedResults.includes(id)
    );

    console.log("=== DEBUG TEST IMAGES ===");
    console.log(`Images dans le bucket: ${availableInBucket.length}`);
    console.log(
      `Images avec résultats attendus: ${withExpectedResults.length}`
    );
    console.log(`Images valides pour test: ${validForTesting.length}`);

    if (validForTesting.length > 0) {
      console.log("Exemples d'images valides:", validForTesting.slice(0, 5));
    }

    return {
      availableInBucket,
      withExpectedResults,
      validForTesting,
    };
  } catch (error) {
    console.error("Erreur lors du debug des images de test:", error);
    return {
      availableInBucket: [],
      withExpectedResults: [],
      validForTesting: [],
    };
  }
}
