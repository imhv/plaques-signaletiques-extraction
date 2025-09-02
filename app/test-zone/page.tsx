"use client";

import { useEffect, useState } from "react";
import { LayoutWrapper } from "@/components/layout-wrapper";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  Eye,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ImagePopup } from "@/components/image-popup";
import {
  loadExpectedResults,
  createRandomSample,
  debugTestImages,
  type TestPredictionResult,
} from "@/app/test-zone/test.actions";
import Image from "next/image";

// Utiliser l'interface TestPredictionResult importée

interface TestRun {
  id: string;
  name: string;
  description: string;
  sampleSize: number;
  status: "running" | "completed" | "failed";
  progress: number;
  results: TestPredictionResult[];
  summary: {
    totalTests: number;
    perfectMatches: number;
    partialMatches: number;
    noMatches: number;
    averageScore: number;
    fieldAccuracy: {
      family: number;
      brand: number;
      model: number;
      version: number;
      serialNumber: number;
    };
  };
  timing: {
    totalTime: number;
    preprocessingTime: number;
    llmTime: number;
    comparisonTime: number;
    averagePerImage: number;
  };
  createdAt: string;
  completedAt?: string;
}

export default function EvaluationPage() {
  const [testName, setTestName] = useState("");
  const [testDescription, setTestDescription] = useState("");
  const [sampleSize, setSampleSize] = useState(5);
  const [batchSize, setBatchSize] = useState(5);
  const [useFullParallel, setUseFullParallel] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gpt-5");
  // const [enableComparison, setEnableComparison] = useState(false); // Désactivé
  // const [enablePreprocessing, setEnablePreprocessing] = useState(true); // Désactivé
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<TestRun | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [testHistory, setTestHistory] = useState<TestRun[]>([]);

  useEffect(() => {
    loadTestHistory();
  }, []);

  const loadTestHistory = () => {
    const saved = localStorage.getItem("testHistory");
    if (saved) {
      setTestHistory(JSON.parse(saved));
    }
  };

  const saveTestHistory = (tests: TestRun[]) => {
    localStorage.setItem("testHistory", JSON.stringify(tests));
  };

  // Les fonctions sont maintenant importées depuis lib/test.actions.ts

  const realExtraction = async (imageId: string): Promise<any> => {
    const startTime = Date.now();
    let preprocessingTime = 0;
    let llmTime = 0;
    let comparisonTime = 0;

    try {
      // Appeler l'API de test d'extraction
      const llmStartTime = Date.now();
      console.log(
        `🌐 Calling API for ${imageId} at ${new Date().toISOString()}`
      );

      const response = await fetch("/api/test-extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageId: imageId,
          method: "llm",
          model: selectedModel,
          // preprocess: enablePreprocessing, // Désactivé
        }),
      });

      llmTime = Date.now() - llmStartTime;
      console.log(`🌐 API call for ${imageId} completed in ${llmTime}ms`);

      // Le prétraitement est inclus dans l'API test-extract, on l'estime à 10% du temps LLM
      preprocessingTime = Math.round(llmTime * 0.1);

      if (!response.ok) {
        console.error(
          `Erreur API pour ${imageId}: ${response.status} ${response.statusText}`
        );
        return {
          family: "ERROR",
          brand: "ERROR",
          model: "ERROR",
          version: "NO_VERSION",
          serialNumber: "ERROR",
          imageUrl: null,
          processedImageUrl: null,
        };
      }

      const data = await response.json();

      // Plus de comparaison d'images
      // let processedImageUrl = null;

      // Mapper les résultats de la DB vers les noms de test
      return {
        family: data.result.product_family,
        brand: data.result.brand,
        model: data.result.model_number,
        version: "NO_VERSION", // Pas de version dans l'API actuelle
        serialNumber: data.result.serial_number,
        imageUrl: data.imageUrl, // URL Supabase de l'image originale
        processedImageUrl: null, // Plus d'images prétraitées
        timing: {
          totalTime: Date.now() - startTime,
          preprocessingTime: preprocessingTime,
          llmTime: llmTime,
          comparisonTime: comparisonTime,
        },
      };
    } catch (error) {
      console.error(`Erreur lors du traitement de ${imageId}:`, error);
      return {
        family: "ERROR",
        brand: "ERROR",
        model: "ERROR",
        version: "NO_VERSION",
        serialNumber: "ERROR",
        imageUrl: null,
        processedImageUrl: null,
      };
    }
  };

  // Fonction pour normaliser le texte (supprimer accents et mettre en minuscules)
  const normalizeText = (text: string): string => {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
      .toLowerCase();
  };

  const compareResults = (expected: any, actual: any) => {
    // Pour family, on vérifie si le mot extrait est contenu dans le mot attendu
    // Cas spécial : si "cave" est présent dans les deux, c'est comptabilisé comme correct
    let familyMatch = false;
    if (expected.family && actual.family) {
      const expectedNormalized = normalizeText(expected.family);
      const actualNormalized = normalizeText(actual.family);

      // Si "cave" est présent dans les deux, c'est une correspondance
      if (
        expectedNormalized.includes("cave") &&
        actualNormalized.includes("cave")
      ) {
        familyMatch = true;
      } else {
        // Sinon, utiliser la logique de correspondance habituelle
        familyMatch =
          expectedNormalized.includes(actualNormalized) ||
          actualNormalized.includes(expectedNormalized);
      }
    }

    const matches = {
      family: familyMatch,
      brand:
        expected.brand && actual.brand
          ? normalizeText(expected.brand) === normalizeText(actual.brand)
          : expected.brand === actual.brand,
      model: expected.model === actual.model,
      version: expected.version === actual.version,
      serialNumber: expected.serialNumber === actual.serialNumber,
    };

    // Calculer le score en excluant le champ version qui n'est pas utilisé
    // Family compte comme 0.5 car c'est une correspondance partielle
    const familyScore = matches.family ? 1 : 0;
    const otherMatches = [matches.brand, matches.model, matches.serialNumber];
    const otherScore = otherMatches.filter(Boolean).length;
    const score = (familyScore + otherScore) / 4;

    return { matches, score };
  };

  const runTest = async () => {
    if (!testName.trim() || sampleSize <= 0) return;

    setIsRunning(true);

    const testId = Date.now().toString();
    // Utiliser les images Supabase
    const selectedImages = await createRandomSample(sampleSize);

    if (selectedImages.length === 0) {
      console.error("Aucune image sélectionnée pour le test");
      setIsRunning(false);
      return;
    }

    console.log(
      `Test démarré avec ${selectedImages.length} images:`,
      selectedImages
    );
    const expectedResults = await loadExpectedResults();

    // Afficher les images choisies avec leurs résultats attendus
    console.log("\n=== IMAGES SÉLECTIONNÉES AVEC RÉSULTATS ATTENDUS ===");
    selectedImages.forEach((imageId, index) => {
      const expected = expectedResults.get(imageId);

      if (expected) {
        console.log(`\n${index + 1}. ${imageId}.jpg (ID: ${imageId})`);
        console.log(`   Famille: ${expected.family}`);
        console.log(`   Marque: ${expected.brand}`);
        console.log(`   Modèle: ${expected.model}`);
        console.log(`   Version: ${expected.version}`);
        console.log(`   Numéro de série: ${expected.serialNumber}`);
      } else {
        console.log(
          `\n${
            index + 1
          }. ${imageId}.jpg (ID: ${imageId}) - AUCUN RÉSULTAT ATTENDU`
        );
      }
    });
    console.log("================================================\n");

    const testRun: TestRun = {
      id: testId,
      name: testName,
      description: testDescription,
      sampleSize,
      status: "running",
      progress: 0,
      results: [],
      summary: {
        totalTests: 0,
        perfectMatches: 0,
        partialMatches: 0,
        noMatches: 0,
        averageScore: 0,
        fieldAccuracy: {
          family: 0,
          brand: 0,
          model: 0,
          version: 0,
          serialNumber: 0,
        },
      },
      timing: {
        totalTime: 0,
        preprocessingTime: 0,
        llmTime: 0,
        comparisonTime: 0,
        averagePerImage: 0,
      },
      createdAt: new Date().toISOString(),
    };

    setCurrentTest(testRun);
    setTestHistory((prev) => [testRun, ...prev]);
    saveTestHistory([testRun, ...testHistory]);

    // Fonction pour prétraiter une image - DÉSACTIVÉE
    // const preprocessImageForComparison = async (
    //   imageId: string
    // ): Promise<string | null> => {
    //   return null; // Toujours retourner null maintenant
    // };

    // Traitement parallèle des images
    const processImage = async (
      imageId: string,
      index: number
    ): Promise<TestPredictionResult | null> => {
      const expected = expectedResults.get(imageId);

      if (!expected) {
        return null;
      }

      try {
        const imageStartTime = Date.now();
        console.log(
          `🚀 Starting processing for image ${imageId} at ${new Date().toISOString()}`
        );

        const actual = await realExtraction(imageId);

        const imageEndTime = Date.now();
        console.log(
          `✅ Completed processing for image ${imageId} in ${
            imageEndTime - imageStartTime
          }ms`
        );

        const { matches, score } = compareResults(expected, actual);

        const result: TestPredictionResult = {
          id: imageId,
          filename: `${imageId}.jpg`,
          imageUrl: actual.imageUrl,
          processedImageUrl: undefined, // Plus d'images prétraitées
          expected,
          actual,
          matches,
          score,
          timing: actual.timing, // Ajouter les données de timing
        };

        // Ne pas mettre à jour le progrès ici pour éviter les conflits React
        // Le progrès sera mis à jour après le traitement de chaque batch

        return result;
      } catch (error) {
        console.error(`Erreur lors du traitement de ${imageId}:`, error);
        return null;
      }
    };

    // Traitement en parallèle avec ou sans limitation de concurrence
    let results: TestPredictionResult[] = [];

    // Prétraitement en parallèle de toutes les images pour la comparaison - DÉSACTIVÉ
    // let preprocessedImages: Map<string, string | null> = new Map();
    // Plus de comparaison d'images

    if (useFullParallel) {
      // Traitement de toutes les images en parallèle
      console.log(
        `Traitement de ${selectedImages.length} images en parallèle complet...`
      );
      const allPromises = selectedImages.map(
        (imageId, index) => processImage(imageId, index) // Plus de preprocessed images
      );

      const allResults = await Promise.all(allPromises);
      results = allResults.filter(
        (result): result is TestPredictionResult => result !== null
      );

      // Mise à jour finale du progrès
      setCurrentTest((prev) => (prev ? { ...prev, progress: 100 } : null));
    } else {
      // Traitement par batch avec limitation de concurrence
      const currentBatchSize = batchSize;
      console.log(
        `Traitement de ${selectedImages.length} images par batch de ${currentBatchSize}...`
      );

      for (let i = 0; i < selectedImages.length; i += currentBatchSize) {
        const batch = selectedImages.slice(i, i + currentBatchSize);
        const batchStartTime = Date.now();
        console.log(
          `📦 Processing batch ${Math.floor(i / currentBatchSize) + 1} with ${
            batch.length
          } images: ${batch.join(", ")}`
        );

        const batchPromises = batch.map(
          (imageId, batchIndex) => processImage(imageId, i + batchIndex) // Plus de preprocessed images
        );

        const batchResults = await Promise.all(batchPromises);
        const validResults = batchResults.filter(
          (result): result is TestPredictionResult => result !== null
        );
        results.push(...validResults);

        const batchEndTime = Date.now();
        console.log(
          `🏁 Completed batch ${Math.floor(i / currentBatchSize) + 1} in ${
            batchEndTime - batchStartTime
          }ms (${validResults.length} successful results)`
        );

        // Mise à jour du progrès et des résultats après chaque batch
        const progress = Math.min(
          ((i + currentBatchSize) / selectedImages.length) * 100,
          100
        );
        setCurrentTest((prev) =>
          prev
            ? {
                ...prev,
                progress,
                results: [...results], // Mettre à jour avec tous les résultats actuels
              }
            : null
        );
      }
    }

    // Calcul des statistiques finales
    const totalTests = results.length;
    const perfectMatches = results.filter((r) => r.score === 1).length;
    const partialMatches = results.filter(
      (r) => r.score > 0 && r.score < 1
    ).length;
    const noMatches = results.filter((r) => r.score === 0).length;
    const averageScore =
      results.reduce((sum, r) => sum + r.score, 0) / totalTests;

    const fieldAccuracy = {
      family: results.filter((r) => r.matches.family).length / totalTests,
      brand: results.filter((r) => r.matches.brand).length / totalTests,
      model: results.filter((r) => r.matches.model).length / totalTests,
      version: results.filter((r) => r.matches.version).length / totalTests,
      serialNumber:
        results.filter((r) => r.matches.serialNumber).length / totalTests,
    };

    // Calcul des statistiques de timing
    const timingStats = {
      totalTime: results.reduce(
        (sum, r) => sum + (r.timing?.totalTime || 0),
        0
      ),
      preprocessingTime: results.reduce(
        (sum, r) => sum + (r.timing?.preprocessingTime || 0),
        0
      ),
      llmTime: results.reduce((sum, r) => sum + (r.timing?.llmTime || 0), 0),
      comparisonTime: results.reduce(
        (sum, r) => sum + (r.timing?.comparisonTime || 0),
        0
      ),
      averagePerImage: 0,
    };
    timingStats.averagePerImage = timingStats.totalTime / totalTests;

    const completedTest: TestRun = {
      ...testRun,
      status: "completed",
      progress: 100,
      results,
      summary: {
        totalTests,
        perfectMatches,
        partialMatches,
        noMatches,
        averageScore,
        fieldAccuracy,
      },
      timing: timingStats,
      completedAt: new Date().toISOString(),
    };

    setCurrentTest(completedTest);
    setTestHistory((prev) =>
      prev.map((t) => (t.id === testId ? completedTest : t))
    );
    saveTestHistory(
      testHistory.map((t) => (t.id === testId ? completedTest : t))
    );

    setIsRunning(false);
    setTestName("");
    setTestDescription("");
    setSampleSize(5);
  };

  const getScoreColor = (score: number) => {
    if (score === 1) return "text-green-600";
    if (score >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = (score: number) => {
    if (score === 1) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (score >= 0.6)
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  return (
    <LayoutWrapper>
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Test Zone"
          description="Create and run tests with random image samples"
          badge={{
            text: `${testHistory.length} tests run`,
            variant: "secondary",
          }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create New Test */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Create New Test
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-name">Test Name</Label>
                <Input
                  id="test-name"
                  placeholder="e.g., Quick Validation Test"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="test-description">Description</Label>
                <Textarea
                  id="test-description"
                  placeholder="Describe what you're testing..."
                  value={testDescription}
                  onChange={(e) => setTestDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sample-size">Number of Images</Label>
                <Input
                  id="sample-size"
                  type="number"
                  min="1"
                  max="100"
                  value={sampleSize}
                  onChange={(e) => setSampleSize(parseInt(e.target.value) || 5)}
                />
                <p className="text-xs text-muted-foreground">
                  Randomly selected from the test dataset
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="batch-size">Parallel Processing</Label>
                <Input
                  id="batch-size"
                  type="number"
                  min="1"
                  max="20"
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value) || 5)}
                  disabled={useFullParallel}
                />
                <p className="text-xs text-muted-foreground">
                  Number of images processed simultaneously (higher = faster but
                  may overload API)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model-select">LLM Model</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                    <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
                    <SelectItem value="gpt-5">GPT-5</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose the LLM model for extraction (5-mini is default)
                </p>
              </div>

              <Button
                onClick={runTest}
                disabled={isRunning || !testName.trim() || sampleSize <= 0}
                className="w-full"
              >
                {isRunning ? `Running Test ` : `Start Test`}
              </Button>
            </CardContent>
          </Card>

          {/* Current Test Progress */}
          {currentTest && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {currentTest.name}
                </CardTitle>
                <CardDescription>{currentTest.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentTest.status === "running" && (
                  <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">
                        Generation in progress, please wait...
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        It can take up to 25 seconds per image
                      </p>
                    </div>
                  </div>
                )}

                {currentTest.status === "completed" && (
                  <div className="space-y-4">
                    {/* Global Results */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-muted rounded-lg">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {currentTest.summary.totalTests}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {currentTest.summary.perfectMatches}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Perfect
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {currentTest.summary.partialMatches}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Partial
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {currentTest.summary.noMatches}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Failed
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {(currentTest.summary.averageScore * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Average
                        </div>
                      </div>
                    </div>

                    {/* Field Accuracy */}
                    <div className="grid grid-cols-5 gap-2 text-xs">
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-medium">Family</div>
                        <div className="text-primary">
                          {(
                            currentTest.summary.fieldAccuracy.family * 100
                          ).toFixed(1)}
                          %
                        </div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-medium">Brand</div>
                        <div className="text-primary">
                          {(
                            currentTest.summary.fieldAccuracy.brand * 100
                          ).toFixed(1)}
                          %
                        </div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-medium">Model</div>
                        <div className="text-primary">
                          {(
                            currentTest.summary.fieldAccuracy.model * 100
                          ).toFixed(1)}
                          %
                        </div>
                      </div>

                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-medium">Serial</div>
                        <div className="text-primary">
                          {(
                            currentTest.summary.fieldAccuracy.serialNumber * 100
                          ).toFixed(1)}
                          %
                        </div>
                      </div>
                    </div>

                    {/* Timing Statistics */}
                    <div className="mt-6">
                      <h4 className="text-sm font-medium mb-3">
                        Timing Statistics
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="font-medium text-blue-900">
                            Total Time
                          </div>
                          <div className="text-blue-700 font-semibold">
                            {(currentTest.timing.totalTime / 1000).toFixed(1)}s
                          </div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="font-medium text-green-900">
                            LLM Processing
                          </div>
                          <div className="text-green-700 font-semibold">
                            {(currentTest.timing.llmTime / 1000).toFixed(1)}s
                          </div>
                        </div>

                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="font-medium text-gray-900">
                            Avg per Image
                          </div>
                          <div className="text-gray-700 font-semibold">
                            {(
                              currentTest.timing.averagePerImage / 1000
                            ).toFixed(1)}
                            s
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Test Results */}
        {currentTest?.status === "completed" && (
          <Card>
            <CardHeader>
              <CardTitle>Detailed Results</CardTitle>
              <CardDescription>
                Line-by-line analysis with image preview
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentTest.results.map((result, index) => (
                  <div key={result.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      {/* Images Preview - Originale et Prétraitée */}
                      <div className="flex-shrink-0">
                        <div className="grid grid-cols-2 gap-2">
                          {/* Image Originale */}
                          <div className="space-y-1">
                            <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden">
                              <Image
                                src={
                                  result.imageUrl ||
                                  `/plaques_test/${result.filename}`
                                }
                                alt={`${result.filename} - Original`}
                                className="w-full h-full object-cover cursor-pointer hover:opacity-80"
                                onClick={() =>
                                  setSelectedImage(
                                    result.imageUrl ||
                                      `/plaques_test/${result.filename}`
                                  )
                                }
                                width={80}
                                height={80}
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs"
                              onClick={() =>
                                setSelectedImage(
                                  result.imageUrl ||
                                    `/plaques_test/${result.filename}`
                                )
                              }
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Original
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Results */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {result.filename}
                            </span>
                            {getScoreIcon(result.score)}
                            {/* Plus d'affichage pour les images prétraitées
                            {result.processedImageUrl && (
                              <Badge variant="secondary" className="text-xs">
                                Prétraitée
                              </Badge>
                            )}
                            */}
                          </div>
                          <Badge
                            className={getScoreColor(result.score)}
                            variant="outline"
                          >
                            {(result.score * 100).toFixed(0)}%
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {/* Family */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Family:</span>
                              {result.matches.family ? (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-600" />
                              )}
                            </div>
                            <div className="text-xs space-y-1">
                              <div className="text-muted-foreground">
                                Expected: {result.expected.family}
                              </div>
                              <div
                                className={
                                  result.matches.family
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                Got: {result.actual.family || "undefined"}
                              </div>
                            </div>
                          </div>

                          {/* Brand */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Brand:</span>
                              {result.matches.brand ? (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-600" />
                              )}
                            </div>
                            <div className="text-xs space-y-1">
                              <div className="text-muted-foreground">
                                Expected: {result.expected.brand}
                              </div>
                              <div
                                className={
                                  result.matches.brand
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                Got: {result.actual.brand || "undefined"}
                              </div>
                            </div>
                          </div>

                          {/* Model */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Model:</span>
                              {result.matches.model ? (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-600" />
                              )}
                            </div>
                            <div className="text-xs space-y-1">
                              <div className="text-muted-foreground">
                                Expected: {result.expected.model}
                              </div>
                              <div
                                className={
                                  result.matches.model
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                Got: {result.actual.model || "undefined"}
                              </div>
                            </div>
                          </div>

                          {/* Serial Number */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Serial:</span>
                              {result.matches.serialNumber ? (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-600" />
                              )}
                            </div>
                            <div className="text-xs space-y-1">
                              <div className="text-muted-foreground">
                                Expected: {result.expected.serialNumber}
                              </div>
                              <div
                                className={
                                  result.matches.serialNumber
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                Got: {result.actual.serialNumber || "undefined"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test History */}
        {testHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Test History</CardTitle>
              <CardDescription>Previous test runs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testHistory.slice(0, 5).map((test) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{test.name}</span>
                        <Badge
                          variant={
                            test.status === "completed"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {test.status}
                        </Badge>
                      </div>
                      {test.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {test.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        <span>{test.sampleSize} images</span>
                        <span>
                          {new Date(test.createdAt).toLocaleDateString()}
                        </span>
                        {test.status === "completed" && (
                          <span className="font-medium text-primary">
                            {(test.summary.averageScore * 100).toFixed(1)}%
                            accuracy
                          </span>
                        )}
                      </div>
                    </div>
                    {test.status === "completed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentTest(test)}
                      >
                        View Results
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Image Popup */}
      {selectedImage && (
        <ImagePopup
          isOpen={!!selectedImage}
          imageUrl={selectedImage}
          filename={selectedImage.split("/").pop() || "image.jpg"}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </LayoutWrapper>
  );
}
