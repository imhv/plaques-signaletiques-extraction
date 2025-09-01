import { createClient } from "@/lib/supabase/server";

export interface TestImage {
  id: string;
  expected: {
    family: string;
    brand: string;
    model: string;
    version: string;
    serialNumber: string;
  };
}

export interface TestResult {
  imageId: string;
  expected: TestImage["expected"];
  actual: {
    family: string;
    brand: string;
    model: string;
    version: string;
    serialNumber: string;
    imageUrl?: string;
  };
  matches: {
    family: boolean;
    brand: boolean;
    model: boolean;
    version: boolean;
    serialNumber: boolean;
  };
  score: number;
}

export async function getTestImages(): Promise<TestImage[]> {
  const supabase = await createClient();

  // Récupérer les images de test depuis le bucket test-images
  const { data: files, error } = await supabase.storage
    .from("test-images")
    .list("", {
      limit: 100,
      offset: 0,
    });

  if (error) {
    throw new Error(`Failed to fetch test images: ${error.message}`);
  }

  // Filtrer les fichiers .jpg et créer les objets de test
  const testImages: TestImage[] = files
    .filter((file) => file.name.endsWith(".jpg"))
    .map((file) => {
      const imageId = file.name.replace(".jpg", "");

      // Données attendues basées sur l'ID de l'image
      // Vous pouvez adapter cette logique selon vos besoins
      return {
        id: imageId,
        expected: {
          family: "LAVE-LINGE", // Valeur par défaut
          brand: "WHIRLPOOL", // Valeur par défaut
          model: "AWOE 8764", // Valeur par défaut
          version: "NO_VERSION",
          serialNumber: "123456789", // Valeur par défaut
        },
      };
    });

  return testImages;
}

export async function runTestOnImage(
  imageId: string,
  extractionFunction: (imageId: string) => Promise<any>
): Promise<TestResult> {
  // Récupérer les données attendues
  const testImages = await getTestImages();
  const testImage = testImages.find((img) => img.id === imageId);

  if (!testImage) {
    throw new Error(`Test image not found: ${imageId}`);
  }

  // Exécuter l'extraction
  const actual = await extractionFunction(imageId);

  // Comparer les résultats
  const matches = {
    family: testImage.expected.family === actual.family,
    brand: testImage.expected.brand === actual.brand,
    model: testImage.expected.model === actual.model,
    version: testImage.expected.version === actual.version,
    serialNumber: testImage.expected.serialNumber === actual.serialNumber,
  };

  const score = Object.values(matches).filter(Boolean).length / 5;

  return {
    imageId,
    expected: testImage.expected,
    actual,
    matches,
    score,
  };
}

export async function saveTestHistory(
  testName: string,
  results: TestResult[]
): Promise<void> {
  // Sauvegarder l'historique des tests dans localStorage côté client
  // Cette fonction sera appelée depuis le composant React
  console.log(`Test "${testName}" completed with ${results.length} results`);
}

export async function getTestHistory(): Promise<
  Array<{
    name: string;
    date: string;
    results: TestResult[];
  }>
> {
  // Récupérer l'historique des tests depuis localStorage côté client
  // Cette fonction sera appelée depuis le composant React
  return [];
}
