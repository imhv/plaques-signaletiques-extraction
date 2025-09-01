"use client"

import { useEffect, useState } from "react"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { PredictionCard } from "@/components/prediction-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Database } from "lucide-react"

interface PredictionData {
  id: string
  brand?: string
  product_family?: string
  model_number?: string
  serial_number?: string
  brand_confidence?: number
  product_family_confidence?: number
  model_number_confidence?: number
  serial_number_confidence?: number
  processing_method: string
  processing_time_ms: number
  created_at: string
  images: {
    id: string
    original_filename: string
    storage_path: string
    uploaded_at: string
  }
}

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<PredictionData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterMethod, setFilterMethod] = useState<string>("all")

  useEffect(() => {
    fetchPredictions()
  }, [])

  const fetchPredictions = async () => {
    try {
      const response = await fetch("/api/predictions")
      if (response.ok) {
        const data = await response.json()
        setPredictions(data.predictions)
      }
    } catch (error) {
      console.error("Failed to fetch predictions:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPredictions = predictions.filter((prediction) => {
    const matchesSearch =
      !searchTerm ||
      prediction.images.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prediction.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prediction.model_number?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filterMethod === "all" || prediction.processing_method === filterMethod

    return matchesSearch && matchesFilter
  })

  const handleVerify = (predictionId: string) => {
    // Navigate to verification page
    window.location.href = `/verification?prediction=${predictionId}`
  }

  const handleEdit = (predictionId: string) => {
    // Navigate to edit page
    window.location.href = `/verification?prediction=${predictionId}&edit=true`
  }

  if (loading) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading predictions...</div>
        </div>
      </LayoutWrapper>
    )
  }

  return (
    <LayoutWrapper>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Predictions</h1>
            <p className="text-muted-foreground mt-1">Review and manage extraction results</p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {predictions.length} predictions
          </Badge>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground flex items-center gap-2">
              <Database className="h-5 w-5" />
              Filter & Search
            </CardTitle>
            <CardDescription>Find specific predictions and results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by filename, brand, or model..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={filterMethod}
                  onChange={(e) => setFilterMethod(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="all">All Methods</option>
                  <option value="llm">LLM Only</option>
                  <option value="ocr">OCR Only</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {filteredPredictions.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-12 text-center">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-card-foreground mb-2">No predictions found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterMethod !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "Upload some images to get started with AI extraction"}
              </p>
              <Button onClick={() => (window.location.href = "/")} className="bg-primary hover:bg-primary/90">
                Upload Images
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredPredictions.map((prediction) => (
              <PredictionCard key={prediction.id} prediction={prediction} onVerify={handleVerify} onEdit={handleEdit} />
            ))}
          </div>
        )}
      </div>
    </LayoutWrapper>
  )
}
