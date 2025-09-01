export interface ExtractionResult {
  brand?: string
  product_family?: string
  model_number?: string
  serial_number?: string
  confidence_scores: {
    brand?: number
    product_family?: number
    model_number?: number
    serial_number?: number
  }
  method: "llm" | "ocr" | "rule_based" | "hybrid"
  processing_time_ms: number
  raw_data?: {
    ocr_text?: string
    llm_response?: any
    rule_matches?: any
  }
}

export interface ImageData {
  id: string
  storage_path: string
  mime_type: string
  user_id: string
}
