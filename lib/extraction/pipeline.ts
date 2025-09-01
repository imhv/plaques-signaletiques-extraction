import { LLMExtractor } from "./llm-extractor"
import { OCRExtractor } from "./ocr-extractor"
import { RuleBasedExtractor } from "./rule-extractor"
import type { ExtractionResult, ImageData } from "./types"
import { createClient } from "@/lib/supabase/server"

export class ExtractionPipeline {
  private llmExtractor = new LLMExtractor()
  private ocrExtractor = new OCRExtractor()
  private ruleExtractor = new RuleBasedExtractor()

  async processImage(imageData: ImageData): Promise<ExtractionResult> {
    const startTime = Date.now()

    try {
      // Get signed URL for the image
      const supabase = await createClient()
      const { data: signedUrlData } = await supabase.storage
        .from("nameplate-images")
        .createSignedUrl(imageData.storage_path, 3600) // 1 hour expiry

      if (!signedUrlData?.signedUrl) {
        throw new Error("Failed to get signed URL for image")
      }

      const imageUrl = signedUrlData.signedUrl

      // Run extractions in parallel for efficiency
      const [llmResult, ocrResult] = await Promise.allSettled([
        this.llmExtractor.extract(imageUrl),
        this.ocrExtractor.extract(imageUrl),
      ])

      // Apply rule-based extraction to OCR text if available
      let ruleResult: ExtractionResult | null = null
      if (ocrResult.status === "fulfilled" && ocrResult.value.raw_data?.ocr_text) {
        try {
          ruleResult = await this.ruleExtractor.extract(ocrResult.value.raw_data.ocr_text)
        } catch (error) {
          console.warn("Rule-based extraction failed:", error)
        }
      }

      // Combine results using hybrid approach
      const hybridResult = this.combineResults(
        [
          llmResult.status === "fulfilled" ? llmResult.value : null,
          ocrResult.status === "fulfilled" ? ocrResult.value : null,
          ruleResult,
        ].filter(Boolean) as ExtractionResult[],
      )

      const totalProcessingTime = Date.now() - startTime

      return {
        ...hybridResult,
        method: "hybrid",
        processing_time_ms: totalProcessingTime,
        raw_data: {
          llm_response: llmResult.status === "fulfilled" ? llmResult.value.raw_data?.llm_response : null,
          ocr_text: ocrResult.status === "fulfilled" ? ocrResult.value.raw_data?.ocr_text : null,
          rule_matches: ruleResult?.raw_data?.rule_matches || null,
        },
      }
    } catch (error) {
      console.error("Pipeline processing failed:", error)
      throw new Error(`Pipeline processing failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  private combineResults(
    results: ExtractionResult[],
  ): Omit<ExtractionResult, "method" | "processing_time_ms" | "raw_data"> {
    if (results.length === 0) {
      return {
        confidence_scores: {},
      }
    }

    // For each field, select the result with highest confidence
    const fields = ["brand", "product_family", "model_number", "serial_number"] as const
    const combined: any = {
      confidence_scores: {},
    }

    for (const field of fields) {
      let bestResult: ExtractionResult | null = null
      let bestConfidence = 0

      for (const result of results) {
        const value = result[field]
        const confidence = result.confidence_scores[field] || 0

        if (value && confidence > bestConfidence) {
          bestResult = result
          bestConfidence = confidence
        }
      }

      if (bestResult && bestResult[field]) {
        combined[field] = bestResult[field]
        combined.confidence_scores[field] = bestConfidence
      }
    }

    return combined
  }

  async saveResult(imageId: string, userId: string, result: ExtractionResult): Promise<string> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("predictions")
      .insert({
        image_id: imageId,
        user_id: userId,
        brand: result.brand,
        product_family: result.product_family,
        model_number: result.model_number,
        serial_number: result.serial_number,
        brand_confidence: result.confidence_scores.brand,
        product_family_confidence: result.confidence_scores.product_family,
        model_number_confidence: result.confidence_scores.model_number,
        serial_number_confidence: result.confidence_scores.serial_number,
        processing_method: result.method,
        processing_time_ms: result.processing_time_ms,
        model_version: "v1.0",
        raw_ocr_text: result.raw_data?.ocr_text,
        raw_llm_response: result.raw_data?.llm_response,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(`Failed to save prediction: ${error.message}`)
    }

    return data.id
  }
}
