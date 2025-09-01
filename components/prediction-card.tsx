"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ImageIcon, Brain, Clock, Edit, Trash2 } from "lucide-react";
import { cn, getSupabaseImageUrl } from "@/lib/utils";
import { ImagePopup } from "@/components/image-popup";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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

interface PredictionCardProps {
  prediction: PredictionData;
  onVerify?: (prediction: PredictionData) => void;
  onEdit?: (prediction: PredictionData) => void;
  onDelete?: (prediction: PredictionData) => void;
}

export function PredictionCard({
  prediction,
  onVerify,
  onEdit,
  onDelete,
}: PredictionCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [imagePopupOpen, setImagePopupOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return "text-muted-foreground";
    if (confidence >= 0.8) return "text-accent";
    if (confidence >= 0.6) return "text-primary";
    return "text-destructive";
  };

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return "Unknown";
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    return "Low";
  };

  const formatProcessingTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const handleExtract = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageId: prediction.images.id,
          force: true, // Force re-extraction by deleting existing prediction
        }),
      });

      if (response.ok) {
        // Refresh the page to show updated prediction
        window.location.reload();
      } else {
        const errorData = await response.json();
        console.error("Extraction failed:", errorData.error);
        // You could add a toast notification here to show the error to the user
      }
    } catch (error) {
      console.error("Extraction failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageClick = () => {
    setImagePopupOpen(true);
  };

  const handleDelete = () => {
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      // Call the onDelete callback if provided (this will handle the actual deletion)
      if (onDelete) {
        await onDelete(prediction);
      }
      // Mark as deleted to hide the card
      setIsDeleted(true);
      // Close the confirmation dialog
      setDeleteConfirmOpen(false);
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmOpen(false);
  };

  // Don't render the card if it's been deleted
  if (isDeleted) {
    return null;
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-card-foreground flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              <button
                onClick={handleImageClick}
                className="hover:text-primary max-w-sm transition-colors cursor-pointer hover:underline truncate"
                title="Click to view image"
              >
                {prediction.images.original_filename}
              </button>
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {prediction.processing_method.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatProcessingTime(prediction.processing_time_ms)}
            </div>
            <div className="flex items-center gap-1">
              <Brain className="h-3 w-3" />
              AI Processed
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-card-foreground">
                    Brand
                  </label>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      getConfidenceColor(prediction.brand_confidence)
                    )}
                  >
                    {getConfidenceBadge(prediction.brand_confidence)}
                  </Badge>
                </div>
                <div className="text-sm text-card-foreground bg-muted px-3 py-2 rounded-md">
                  {prediction.brand || "Not detected"}
                </div>
                {prediction.brand_confidence && (
                  <Progress
                    value={prediction.brand_confidence * 100}
                    className="h-1"
                  />
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-card-foreground">
                    Product Family
                  </label>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      getConfidenceColor(prediction.product_family_confidence)
                    )}
                  >
                    {getConfidenceBadge(prediction.product_family_confidence)}
                  </Badge>
                </div>
                <div className="text-sm text-card-foreground bg-muted px-3 py-2 rounded-md">
                  {prediction.product_family || "Not detected"}
                </div>
                {prediction.product_family_confidence && (
                  <Progress
                    value={prediction.product_family_confidence * 100}
                    className="h-1"
                  />
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-card-foreground">
                    Model Number
                  </label>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      getConfidenceColor(prediction.model_number_confidence)
                    )}
                  >
                    {getConfidenceBadge(prediction.model_number_confidence)}
                  </Badge>
                </div>
                <div className="text-sm text-card-foreground bg-muted px-3 py-2 rounded-md">
                  {prediction.model_number || "Not detected"}
                </div>
                {prediction.model_number_confidence && (
                  <Progress
                    value={prediction.model_number_confidence * 100}
                    className="h-1"
                  />
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-card-foreground">
                    Serial Number
                  </label>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      getConfidenceColor(prediction.serial_number_confidence)
                    )}
                  >
                    {getConfidenceBadge(prediction.serial_number_confidence)}
                  </Badge>
                </div>
                <div className="text-sm text-card-foreground bg-muted px-3 py-2 rounded-md">
                  {prediction.serial_number || "Not detected"}
                </div>
                {prediction.serial_number_confidence && (
                  <Progress
                    value={prediction.serial_number_confidence * 100}
                    className="h-1"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => onEdit?.(prediction)}
              variant="outline"
              className="flex-1"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>

            <Button
              onClick={handleExtract}
              disabled={isProcessing}
              variant="secondary"
            >
              {isProcessing ? "Processing..." : "Re-extract"}
            </Button>

            <Button
              onClick={handleDelete}
              variant="destructive"
              size="icon"
              className="h-10 w-10"
              title="Delete prediction"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <ImagePopup
        isOpen={imagePopupOpen}
        onClose={() => setImagePopupOpen(false)}
        imageUrl={getSupabaseImageUrl(prediction.images.storage_path)}
        filename={prediction.images.original_filename}
      />

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cette prédiction ? Cette action
              est irréversible et supprimera définitivement les données
              extraites pour l'image "{prediction.images.original_filename}".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={cancelDelete}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
