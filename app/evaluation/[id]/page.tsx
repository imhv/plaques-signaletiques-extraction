"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, BarChart3, CheckCircle, XCircle, ImageIcon } from "lucide-react"
import Link from "next/link"

interface BatchResult {
  id: string
  brand_match?: boolean
  product_family_match?: boolean
  model_number_match?: boolean
  serial_number_match?: boolean
  overall_match?: boolean
  images: {
    id: string
    original_filename: string
    storage_path: string
  }
  predictions: {
    id: string
    brand?: string
    product_family?: string
    model_number?: string
    serial_number?: string
    brand_confidence?: number
    product_family_confidence?: number
    model_number_confidence?: number
    serial_number_confidence?: number
  }
  ground_truth?: {
    id: string
    brand?: string
    product_family?: string
    model_number?: string
    serial_number?: string
  }
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

export default function BatchDetailsPage() {
  const params = useParams()
  const batchId = params.id as string
  const [batch, setBatch] = useState<BatchData | null>(null)
  const [results, setResults] = useState<BatchResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (batchId) {
      fetchBatchDetails()
    }
  }, [batchId])

  const fetchBatchDetails = async () => {
    try {
      const response = await fetch(`/api/evaluate/batch/${batchId}`)
      if (response.ok) {
        const data = await response.json()
        setBatch(data.batch)
        setResults(data.results)
      }
    } catch (error) {
      console.error("Failed to fetch batch details:", error)
    } finally {
      setLoading(false)
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

  const getMatchIcon = (match?: boolean) => {
    if (match === true) return <CheckCircle className="h-4 w-4 text-accent" />
    if (match === false) return <XCircle className="h-4 w-4 text-destructive" />
    return <div className="h-4 w-4 bg-muted rounded-full" />
  }

  if (loading) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading batch details...</div>
        </div>
      </LayoutWrapper>
    )
  }

  if (!batch) {
    return (
      <LayoutWrapper>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-foreground mb-2">Batch not found</h2>
          <p className="text-muted-foreground mb-4">The requested batch evaluation could not be found.</p>
          <Link href="/evaluation">
            <Button>Back to Evaluation</Button>
          </Link>
        </div>
      </LayoutWrapper>
    )
  }

  return (
    <LayoutWrapper>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/evaluation">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{batch.name}</h1>
            <p className="text-muted-foreground mt-1">Batch evaluation details and results</p>
          </div>
          <Badge className={getStatusColor(batch.status)}>{batch.status}</Badge>
        </div>

        {/* Batch Overview */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Batch Overview
            </CardTitle>
            {batch.description && <CardDescription>{batch.description}</CardDescription>}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{batch.total_images}</div>
                <div className="text-sm text-muted-foreground">Total Images</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{batch.processed_images}</div>
                <div className="text-sm text-muted-foreground">Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{formatAccuracy(batch.overall_accuracy)}</div>
                <div className="text-sm text-muted-foreground">Overall Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {batch.completed_at
                    ? new Date(batch.completed_at).toLocaleDateString()
                    : new Date(batch.created_at).toLocaleDateString()}
                </div>
                <div className="text-sm text-muted-foreground">{batch.completed_at ? "Completed" : "Started"}</div>
              </div>
            </div>

            {batch.status === "processing" && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Processing Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {batch.processed_images}/{batch.total_images}
                  </span>
                </div>
                <Progress value={(batch.processed_images / batch.total_images) * 100} className="h-3" />
              </div>
            )}

            {batch.status === "completed" && (
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-semibold text-foreground">{formatAccuracy(batch.brand_accuracy)}</div>
                  <div className="text-xs text-muted-foreground">Brand Accuracy</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-semibold text-foreground">
                    {formatAccuracy(batch.product_family_accuracy)}
                  </div>
                  <div className="text-xs text-muted-foreground">Product Family</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-semibold text-foreground">
                    {formatAccuracy(batch.model_number_accuracy)}
                  </div>
                  <div className="text-xs text-muted-foreground">Model Number</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-semibold text-foreground">
                    {formatAccuracy(batch.serial_number_accuracy)}
                  </div>
                  <div className="text-xs text-muted-foreground">Serial Number</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Individual Results */}
        {results.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground">Individual Results</CardTitle>
              <CardDescription>Detailed results for each processed image</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((result) => (
                  <div key={result.id} className="p-4 border border-border rounded-lg bg-muted">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-card-foreground">{result.images.original_filename}</span>
                      </div>
                      {result.overall_match !== undefined && (
                        <Badge variant={result.overall_match ? "default" : "destructive"}>
                          {result.overall_match ? "Match" : "No Match"}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Brand</span>
                          {getMatchIcon(result.brand_match)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Predicted: {result.predictions.brand || "None"}
                        </div>
                        {result.ground_truth && (
                          <div className="text-sm text-muted-foreground">
                            Actual: {result.ground_truth.brand || "None"}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Product Family</span>
                          {getMatchIcon(result.product_family_match)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Predicted: {result.predictions.product_family || "None"}
                        </div>
                        {result.ground_truth && (
                          <div className="text-sm text-muted-foreground">
                            Actual: {result.ground_truth.product_family || "None"}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Model Number</span>
                          {getMatchIcon(result.model_number_match)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Predicted: {result.predictions.model_number || "None"}
                        </div>
                        {result.ground_truth && (
                          <div className="text-sm text-muted-foreground">
                            Actual: {result.ground_truth.model_number || "None"}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Serial Number</span>
                          {getMatchIcon(result.serial_number_match)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Predicted: {result.predictions.serial_number || "None"}
                        </div>
                        {result.ground_truth && (
                          <div className="text-sm text-muted-foreground">
                            Actual: {result.ground_truth.serial_number || "None"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </LayoutWrapper>
  )
}
