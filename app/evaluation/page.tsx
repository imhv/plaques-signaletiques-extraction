"use client"

import { useEffect, useState } from "react"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { BarChart3, Play, Clock, ImageIcon } from "lucide-react"

interface ImageData {
  id: string
  original_filename: string
  storage_path: string
  uploaded_at: string
  predictions?: Array<{
    id: string
    brand?: string
    model_number?: string
    serial_number?: string
  }>
}

interface BatchData {
  id: string
  name: string
  description?: string
  status: string
  total_images: number
  processed_images: number
  overall_accuracy?: number
  brand_accuracy?: number
  product_family_accuracy?: number
  model_number_accuracy?: number
  serial_number_accuracy?: number
  created_at: string
  completed_at?: string
}

export default function EvaluationPage() {
  const [images, setImages] = useState<ImageData[]>([])
  const [batches, setBatches] = useState<BatchData[]>([])
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [batchName, setBatchName] = useState("")
  const [batchDescription, setBatchDescription] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchImages()
    fetchBatches()
  }, [])

  const fetchImages = async () => {
    try {
      const response = await fetch("/api/images")
      if (response.ok) {
        const data = await response.json()
        setImages(data.images)
      }
    } catch (error) {
      console.error("Failed to fetch images:", error)
    }
  }

  const fetchBatches = async () => {
    try {
      const response = await fetch("/api/evaluate/batch")
      if (response.ok) {
        const data = await response.json()
        setBatches(data.batches || [])
      }
    } catch (error) {
      console.error("Failed to fetch batches:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageSelect = (imageId: string, checked: boolean) => {
    const newSelected = new Set(selectedImages)
    if (checked) {
      newSelected.add(imageId)
    } else {
      newSelected.delete(imageId)
    }
    setSelectedImages(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedImages(new Set(images.map((img) => img.id)))
    } else {
      setSelectedImages(new Set())
    }
  }

  const handleCreateBatch = async () => {
    if (!batchName.trim() || selectedImages.size === 0) return

    setIsCreating(true)
    try {
      const response = await fetch("/api/evaluate/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: batchName,
          description: batchDescription,
          imageIds: Array.from(selectedImages),
        }),
      })

      if (response.ok) {
        setBatchName("")
        setBatchDescription("")
        setSelectedImages(new Set())
        fetchBatches()
      }
    } catch (error) {
      console.error("Failed to create batch:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-accent text-accent-foreground"
      case "processing":
        return "bg-primary text-primary-foreground"
      case "failed":
        return "bg-destructive text-destructive-foreground"
      default:
        return "bg-secondary text-secondary-foreground"
    }
  }

  const formatAccuracy = (accuracy?: number) => {
    return accuracy ? `${accuracy.toFixed(1)}%` : "N/A"
  }

  if (loading) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading evaluation data...</div>
        </div>
      </LayoutWrapper>
    )
  }

  return (
    <LayoutWrapper>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Batch Evaluation</h1>
            <p className="text-muted-foreground mt-1">Run batch processing and evaluate AI accuracy</p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {images.length} images available
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create New Batch */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center gap-2">
                <Play className="h-5 w-5" />
                Create New Batch
              </CardTitle>
              <CardDescription>Select images and run batch evaluation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="batch-name">Batch Name</Label>
                <Input
                  id="batch-name"
                  placeholder="e.g., Weekly Evaluation"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="batch-description">Description (Optional)</Label>
                <Textarea
                  id="batch-description"
                  placeholder="Describe this batch evaluation..."
                  value={batchDescription}
                  onChange={(e) => setBatchDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Select Images ({selectedImages.size} selected)</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedImages.size === images.length && images.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label htmlFor="select-all" className="text-sm">
                      Select All
                    </Label>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 border border-border rounded-md p-3">
                  {images.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      No images available. Upload some images first.
                    </p>
                  ) : (
                    images.map((image) => (
                      <div key={image.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`image-${image.id}`}
                          checked={selectedImages.has(image.id)}
                          onCheckedChange={(checked) => handleImageSelect(image.id, checked as boolean)}
                        />
                        <Label htmlFor={`image-${image.id}`} className="flex-1 text-sm truncate">
                          {image.original_filename}
                        </Label>
                        {image.predictions && image.predictions.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Processed
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <Button
                onClick={handleCreateBatch}
                disabled={isCreating || !batchName.trim() || selectedImages.size === 0}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isCreating ? "Creating Batch..." : `Create Batch (${selectedImages.size} images)`}
              </Button>
            </CardContent>
          </Card>

          {/* Recent Batches */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Recent Batches
              </CardTitle>
              <CardDescription>View batch evaluation results</CardDescription>
            </CardHeader>
            <CardContent>
              {batches.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No batch evaluations yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {batches.slice(0, 5).map((batch) => (
                    <div key={batch.id} className="p-4 border border-border rounded-lg bg-muted">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-card-foreground">{batch.name}</h4>
                        <Badge className={getStatusColor(batch.status)}>{batch.status}</Badge>
                      </div>

                      {batch.description && <p className="text-sm text-muted-foreground mb-3">{batch.description}</p>}

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />
                          {batch.total_images} images
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(batch.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {batch.status === "processing" && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">Progress</span>
                            <span className="text-sm text-muted-foreground">
                              {batch.processed_images}/{batch.total_images}
                            </span>
                          </div>
                          <Progress value={(batch.processed_images / batch.total_images) * 100} className="h-2" />
                        </div>
                      )}

                      {batch.status === "completed" && batch.overall_accuracy !== undefined && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex justify-between">
                            <span>Overall:</span>
                            <span className="font-medium">{formatAccuracy(batch.overall_accuracy)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Brand:</span>
                            <span className="font-medium">{formatAccuracy(batch.brand_accuracy)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Model:</span>
                            <span className="font-medium">{formatAccuracy(batch.model_number_accuracy)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Serial:</span>
                            <span className="font-medium">{formatAccuracy(batch.serial_number_accuracy)}</span>
                          </div>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 bg-transparent"
                        onClick={() => (window.location.href = `/evaluation/${batch.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </LayoutWrapper>
  )
}
