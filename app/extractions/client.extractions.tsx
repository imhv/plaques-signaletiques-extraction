"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
import { PredictionCard } from "@/components/prediction-card";
import { VerificationSheet } from "@/components/verification-sheet";
import {
  type PredictionData,
  type PredictionsResponse,
} from "./data.extraction";

interface ExtractionsClientProps {
  initialData: PredictionsResponse;
  searchTerm: string;
  filterMethod: string;
}

export function ExtractionsInteractions({
  initialData,
  searchTerm,
  filterMethod,
}: ExtractionsClientProps) {
  const router = useRouter();

  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [localFilterMethod, setLocalFilterMethod] = useState(filterMethod);
  const [verificationSheetOpen, setVerificationSheetOpen] = useState(false);
  const [selectedPrediction, setSelectedPrediction] =
    useState<PredictionData | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Fonction pour normaliser le texte (supprimer accents et mettre en minuscules)
  const normalizeText = (text: string): string => {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
      .toLowerCase();
  };

  // Filtrer les prédictions localement
  const filteredPredictions = useMemo(() => {
    let filtered = initialData.predictions;

    // Filtrer par méthode
    if (localFilterMethod && localFilterMethod !== "all") {
      filtered = filtered.filter(
        (prediction) => prediction.processing_method === localFilterMethod
      );
    }

    // Filtrer par terme de recherche
    if (localSearchTerm) {
      const normalizedSearchTerm = normalizeText(localSearchTerm);
      filtered = filtered.filter((prediction) => {
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

    return filtered;
  }, [initialData.predictions, localSearchTerm, localFilterMethod]);

  const handleSearch = (value: string) => {
    setLocalSearchTerm(value);
  };

  const handleFilterChange = (value: string) => {
    setLocalFilterMethod(value);
  };

  const handleVerify = (prediction: PredictionData) => {
    setSelectedPrediction(prediction);
    setEditMode(false);
    setVerificationSheetOpen(true);
  };

  const handleEdit = (prediction: PredictionData) => {
    setSelectedPrediction(prediction);
    setEditMode(true);
    setVerificationSheetOpen(true);
  };

  const handleDelete = async (prediction: PredictionData) => {
    try {
      const response = await fetch(`/api/predictions?id=${prediction.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete prediction");
      }

      // Recharger la page pour mettre à jour les données
      router.refresh();
    } catch (error) {
      console.error("Failed to delete prediction:", error);
    }
  };

  return (
    <>
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by filename, brand, or model..."
            value={localSearchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={localFilterMethod}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
          >
            <option value="all">All Methods</option>
            <option value="llm">LLM Vision</option>
          </select>
        </div>
      </div>

      {filteredPredictions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {localSearchTerm || localFilterMethod !== "all"
              ? "Try adjusting your search or filter criteria"
              : "No predictions found"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {filteredPredictions.map((prediction) => (
            <PredictionCard
              key={prediction.id}
              prediction={prediction}
              onVerify={handleVerify}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <VerificationSheet
        prediction={selectedPrediction}
        isOpen={verificationSheetOpen}
        onOpenChange={setVerificationSheetOpen}
        editMode={editMode}
      />
    </>
  );
}
