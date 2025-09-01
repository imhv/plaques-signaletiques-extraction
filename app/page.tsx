"use client";

import { useState } from "react";
import { ImageUpload } from "@/components/image-upload";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { PredictionCard } from "@/components/prediction-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Zap, CheckCircle, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";

interface UploadedImage {
  id: string;
  filename: string;
  originalFilename: string;
  storagePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

interface PredictionData {
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

export default function HomePage() {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [processingImages, setProcessingImages] = useState<Set<string>>(
    new Set()
  );
  const [predictions, setPredictions] = useState<PredictionData[]>([]);

  const handleUploadComplete = (images: UploadedImage[]) => {
    setUploadedImages((prev) => [...prev, ...images]);
  };

  const handleProcessImage = async (imageId: string) => {
    setProcessingImages((prev) => new Set(prev).add(imageId));

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Extraction result:", result);

        // Utiliser directement les données de prédiction retournées
        if (result.result) {
          // Trouver l'image correspondante
          const image = uploadedImages.find((img) => img.id === imageId);
          if (image) {
            // Créer l'objet PredictionData avec les données retournées
            const prediction: PredictionData = {
              id: `temp-${Date.now()}`, // ID temporaire
              brand: result.result.brand,
              product_family: result.result.product_family,
              model_number: result.result.model_number,
              serial_number: result.result.serial_number,
              brand_confidence: result.result.confidence_scores?.brand,
              product_family_confidence:
                result.result.confidence_scores?.product_family,
              model_number_confidence:
                result.result.confidence_scores?.model_number,
              serial_number_confidence:
                result.result.confidence_scores?.serial_number,
              processing_method: result.result.method,
              processing_time_ms: result.result.processing_time_ms,
              created_at: new Date().toISOString(),
              images: {
                id: image.id,
                original_filename: image.originalFilename,
                storage_path: image.storagePath,
                uploaded_at: image.uploadedAt,
              },
            };

            setPredictions((prev) => [...prev, prediction]);
            // Supprimer l'image de la liste des images à traiter
            setUploadedImages((prev) =>
              prev.filter((img) => img.id !== imageId)
            );
          }
        }
      }
    } catch (error) {
      console.error("Processing failed:", error);
    } finally {
      setProcessingImages((prev) => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    }
  };

  const handleDeletePrediction = async (prediction: PredictionData) => {
    try {
      const response = await fetch(`/api/predictions/${prediction.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPredictions((prev) => prev.filter((p) => p.id !== prediction.id));
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  return (
    <LayoutWrapper>
      <div className="max-w-6xl mx-auto space-y-8">
        <PageHeader
          title="Upload & Process Images"
          description="Upload images of appliance nameplates to extract brand, model, and serial information using AI"
        />

        <Card className="bg-card border-border">
          <CardContent className="space-y-6">
            <ImageUpload
              maxFiles={10}
              maxFileSize={10 * 1024 * 1024}
              onUploadComplete={handleUploadComplete}
            />

            {uploadedImages.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-card-foreground">
                    Images to Process
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUploadedImages([])}
                    className="text-destructive hover:text-destructive"
                  >
                    Clear All
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {uploadedImages.map((image) => {
                    const isProcessing = processingImages.has(image.id);
                    return (
                      <div
                        key={image.id}
                        className="p-4 border border-border rounded-lg bg-muted"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-card-foreground truncate">
                            {image.originalFilename}
                          </h4>
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(image.fileSize / 1024)} KB
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleProcessImage(image.id)}
                            disabled={isProcessing}
                            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                          >
                            {isProcessing ? "Processing..." : "Extract"}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              setUploadedImages((prev) =>
                                prev.filter((img) => img.id !== image.id)
                              )
                            }
                            className="h-10 w-10 text-destructive hover:text-destructive"
                            title="Remove image"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {predictions.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground">
                Extraction Results
              </CardTitle>
              <CardDescription>
                AI-extracted information from your images
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {predictions.map((prediction) => (
                  <PredictionCard
                    key={prediction.id}
                    prediction={prediction}
                    onDelete={handleDeletePrediction}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </LayoutWrapper>
  );
}
