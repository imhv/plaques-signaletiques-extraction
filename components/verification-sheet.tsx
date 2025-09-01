"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Edit, Save, ImageIcon } from "lucide-react";

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
  images: {
    id: string;
    original_filename: string;
    storage_path: string;
  };
}

interface GroundTruthData {
  id?: string;
  brand?: string;
  product_family?: string;
  model_number?: string;
  serial_number?: string;
  verification_notes?: string;
}

interface VerificationSheetProps {
  prediction: PredictionData | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editMode?: boolean;
}

export function VerificationSheet({
  prediction,
  isOpen,
  onOpenChange,
  editMode = false,
}: VerificationSheetProps) {
  const [groundTruth, setGroundTruth] = useState<GroundTruthData>({});
  const [isEditing, setIsEditing] = useState(editMode);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (prediction && isOpen) {
      fetchGroundTruth();
      // Initialize ground truth with prediction values if not editing
      if (!editMode) {
        setGroundTruth({
          brand: prediction.brand,
          product_family: prediction.product_family,
          model_number: prediction.model_number,
          serial_number: prediction.serial_number,
        });
      }
    }
  }, [prediction, isOpen, editMode]);

  // Sync isEditing with editMode prop
  useEffect(() => {
    setIsEditing(editMode);
  }, [editMode]);

  const fetchGroundTruth = async () => {
    if (!prediction) return;

    try {
      const response = await fetch(
        `/api/predictions/${prediction.id}/ground-truth`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.groundTruth) {
          setGroundTruth(data.groundTruth);
        }
      }
    } catch (error) {
      console.error("Failed to fetch ground truth:", error);
    }
  };

  const handleSave = async () => {
    if (!prediction) return;

    setIsSaving(true);
    try {
      // Filter out empty fields and only save fields that have been filled
      const dataToSave: GroundTruthData = {};

      if (groundTruth.brand && groundTruth.brand.trim() !== "") {
        dataToSave.brand = groundTruth.brand.trim();
      }

      if (
        groundTruth.product_family &&
        groundTruth.product_family.trim() !== ""
      ) {
        dataToSave.product_family = groundTruth.product_family.trim();
      }

      if (groundTruth.model_number && groundTruth.model_number.trim() !== "") {
        dataToSave.model_number = groundTruth.model_number.trim();
      }

      if (
        groundTruth.serial_number &&
        groundTruth.serial_number.trim() !== ""
      ) {
        dataToSave.serial_number = groundTruth.serial_number.trim();
      }

      if (
        groundTruth.verification_notes &&
        groundTruth.verification_notes.trim() !== ""
      ) {
        dataToSave.verification_notes = groundTruth.verification_notes.trim();
      }

      const response = await fetch(
        `/api/predictions/${prediction.id}/ground-truth`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataToSave),
        }
      );

      if (response.ok) {
        setIsEditing(false);
        // Optionally show success message
      }
    } catch (error) {
      console.error("Failed to save ground truth:", error);
    } finally {
      setIsSaving(false);
    }
  };

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

  if (!prediction) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="w-[800px] sm:max-w-[800px]">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Prediction not found
            </h2>
            <p className="text-muted-foreground mb-4">
              The requested prediction could not be found.
            </p>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[800px] sm:max-w-[800px] px-6 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Verification
          </SheetTitle>
          <SheetDescription>
            Verify and correct AI predictions for{" "}
            {prediction.images.original_filename}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                {prediction.images.original_filename}
              </CardTitle>
              <CardDescription>AI Prediction vs Ground Truth</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* AI Prediction Column */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-card-foreground">
                    AI Prediction
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-sm font-medium">Brand</Label>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getConfidenceColor(
                            prediction.brand_confidence
                          )}`}
                        >
                          {getConfidenceBadge(prediction.brand_confidence)}
                        </Badge>
                      </div>
                      <div className="text-sm bg-muted px-3 py-2 rounded-md">
                        {prediction.brand || "Not detected"}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-sm font-medium">
                          Product Family
                        </Label>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getConfidenceColor(
                            prediction.product_family_confidence
                          )}`}
                        >
                          {getConfidenceBadge(
                            prediction.product_family_confidence
                          )}
                        </Badge>
                      </div>
                      <div className="text-sm bg-muted px-3 py-2 rounded-md">
                        {prediction.product_family || "Not detected"}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-sm font-medium">
                          Model Number
                        </Label>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getConfidenceColor(
                            prediction.model_number_confidence
                          )}`}
                        >
                          {getConfidenceBadge(
                            prediction.model_number_confidence
                          )}
                        </Badge>
                      </div>
                      <div className="text-sm bg-muted px-3 py-2 rounded-md">
                        {prediction.model_number || "Not detected"}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-sm font-medium">
                          Serial Number
                        </Label>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getConfidenceColor(
                            prediction.serial_number_confidence
                          )}`}
                        >
                          {getConfidenceBadge(
                            prediction.serial_number_confidence
                          )}
                        </Badge>
                      </div>
                      <div className="text-sm bg-muted px-3 py-2 rounded-md">
                        {prediction.serial_number || "Not detected"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ground Truth Column */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-card-foreground">
                    Ground Truth
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="gt-brand" className="text-sm font-medium">
                        Brand
                      </Label>
                      <Input
                        id="gt-brand"
                        value={groundTruth.brand || ""}
                        onChange={(e) =>
                          setGroundTruth({
                            ...groundTruth,
                            brand: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                        placeholder="Enter correct brand"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="gt-product-family"
                        className="text-sm font-medium"
                      >
                        Product Family
                      </Label>
                      <Input
                        id="gt-product-family"
                        value={groundTruth.product_family || ""}
                        onChange={(e) =>
                          setGroundTruth({
                            ...groundTruth,
                            product_family: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                        placeholder="Enter correct product family"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="gt-model-number"
                        className="text-sm font-medium"
                      >
                        Model Number
                      </Label>
                      <Input
                        id="gt-model-number"
                        value={groundTruth.model_number || ""}
                        onChange={(e) =>
                          setGroundTruth({
                            ...groundTruth,
                            model_number: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                        placeholder="Enter correct model number"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="gt-serial-number"
                        className="text-sm font-medium"
                      >
                        Serial Number
                      </Label>
                      <Input
                        id="gt-serial-number"
                        value={groundTruth.serial_number || ""}
                        onChange={(e) =>
                          setGroundTruth({
                            ...groundTruth,
                            serial_number: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                        placeholder="Enter correct serial number"
                      />
                    </div>

                    <div>
                      <Label htmlFor="gt-notes" className="text-sm font-medium">
                        Verification Notes
                      </Label>
                      <Textarea
                        id="gt-notes"
                        value={groundTruth.verification_notes || ""}
                        onChange={(e) =>
                          setGroundTruth({
                            ...groundTruth,
                            verification_notes: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                        placeholder="Add any notes about the verification..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action buttons at the bottom */}
        <div className="mt-8 flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-accent hover:bg-accent/90"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
