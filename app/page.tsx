"use client"

import { useState } from "react"
import { ImageUpload } from "@/components/image-upload"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Upload, Zap, CheckCircle } from "lucide-react"

interface UploadedImage {
  id: string
  filename: string
  originalFilename: string
  storagePath: string
  fileSize: number
  mimeType: string
  uploadedAt: string
}

export default function HomePage() {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [processingImages, setProcessingImages] = useState<Set<string>>(new Set())

  const handleUploadComplete = (images: UploadedImage[]) => {
    setUploadedImages((prev) => [...prev, ...images])
  }

  const handleProcessImage = async (imageId: string) => {
    setProcessingImages((prev) => new Set(prev).add(imageId))

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log("Extraction result:", result)
        // You could show a success message or redirect to predictions
      }
    } catch (error) {
      console.error("Processing failed:", error)
    } finally {
      setProcessingImages((prev) => {
        const newSet = new Set(prev)
        newSet.delete(imageId)
        return newSet
      })
    }
  }

  return (
    <LayoutWrapper>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Nameplate Extraction Dashboard</h1>
          <p className="text-muted-foreground mt-2 text-balance">
            Upload images of appliance nameplates to extract brand, model, and serial information using AI
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground">Upload Images</h3>
                  <p className="text-sm text-muted-foreground">Drag & drop nameplate photos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Zap className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground">AI Processing</h3>
                  <p className="text-sm text-muted-foreground">Extract data automatically</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground">Verify Results</h3>
                  <p className="text-sm text-muted-foreground">Review and correct data</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Upload Images</CardTitle>
            <CardDescription>
              Upload nameplate images from washing machines, dryers, and other appliances
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUpload maxFiles={10} maxFileSize={10 * 1024 * 1024} onUploadComplete={handleUploadComplete} />
          </CardContent>
        </Card>

        {uploadedImages.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground">Process Images</CardTitle>
              <CardDescription>Run AI extraction on your uploaded images</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {uploadedImages.map((image) => {
                  const isProcessing = processingImages.has(image.id)
                  return (
                    <div key={image.id} className="p-4 border border-border rounded-lg bg-muted">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-card-foreground truncate">{image.originalFilename}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(image.fileSize / 1024)} KB
                        </Badge>
                      </div>
                      <Button
                        onClick={() => handleProcessImage(image.id)}
                        disabled={isProcessing}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {isProcessing ? "Processing..." : "Extract Data"}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </LayoutWrapper>
  )
}
