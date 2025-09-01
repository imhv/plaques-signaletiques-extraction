"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check, X, AlertCircle } from "lucide-react";

interface ValidationResult {
  brand?: {
    normalized?: string;
    confidence?: number;
    found_in_database: boolean;
    original: string;
  };
  product_family?: {
    normalized?: string;
    confidence?: number;
    found_in_database: boolean;
    original: string;
  };
  reasoning?: string;
}

export function NameValidator() {
  const [brand, setBrand] = useState("");
  const [productFamily, setProductFamily] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleValidation = async () => {
    if (!brand && !productFamily) {
      setError("Please enter at least one value to validate");
      return;
    }

    setIsValidating(true);
    setError(null);
    setValidationResult(null);

    try {
      const response = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: brand || undefined,
          product_family: productFamily || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Validation failed");
      }

      const data = await response.json();
      setValidationResult(data.validation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setIsValidating(false);
    }
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return "bg-gray-100 text-gray-600";
    if (confidence >= 0.8) return "bg-green-100 text-green-800";
    if (confidence >= 0.6) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getConfidenceText = (confidence?: number) => {
    if (!confidence) return "Unknown";
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    return "Low";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Name Validator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Enter brand name..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-family">Product Family</Label>
              <Input
                id="product-family"
                value={productFamily}
                onChange={(e) => setProductFamily(e.target.value)}
                placeholder="Enter product family..."
              />
            </div>
          </div>

          <Button
            onClick={handleValidation}
            disabled={isValidating || (!brand && !productFamily)}
            className="w-full"
          >
            {isValidating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              "Validate Names"
            )}
          </Button>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-red-800">{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle>Validation Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {validationResult.brand && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Brand</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Original:
                    </span>
                    <span className="font-mono text-sm">
                      {validationResult.brand.original}
                    </span>
                  </div>
                  {validationResult.brand.normalized && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Normalized:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {validationResult.brand.normalized}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {validationResult.brand.found_in_database
                            ? "In DB"
                            : "Not in DB"}
                        </Badge>
                      </div>
                    </div>
                  )}
                  {validationResult.brand.confidence !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Confidence:
                      </span>
                      <Badge
                        className={getConfidenceColor(
                          validationResult.brand.confidence
                        )}
                      >
                        {getConfidenceText(validationResult.brand.confidence)} (
                        {(validationResult.brand.confidence * 100).toFixed(0)}%)
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {validationResult.product_family && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Product Family</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Original:
                    </span>
                    <span className="font-mono text-sm">
                      {validationResult.product_family.original}
                    </span>
                  </div>
                  {validationResult.product_family.normalized && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Normalized:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {validationResult.product_family.normalized}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {validationResult.product_family.found_in_database
                            ? "In DB"
                            : "Not in DB"}
                        </Badge>
                      </div>
                    </div>
                  )}
                  {validationResult.product_family.confidence !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Confidence:
                      </span>
                      <Badge
                        className={getConfidenceColor(
                          validationResult.product_family.confidence
                        )}
                      >
                        {getConfidenceText(
                          validationResult.product_family.confidence
                        )}{" "}
                        (
                        {(
                          validationResult.product_family.confidence * 100
                        ).toFixed(0)}
                        %)
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {validationResult.reasoning && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Reasoning</Label>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  {validationResult.reasoning}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
