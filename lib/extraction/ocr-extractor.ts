import type { ExtractionResult } from "./types"

export class OCRExtractor {
  async extract(imageUrl: string): Promise<ExtractionResult> {
    const startTime = Date.now()

    try {
      // Use a web-based OCR service (OCR.space API as example)
      const response = await fetch("https://api.ocr.space/parse/imageurl", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          apikey: process.env.OCR_SPACE_API_KEY || "helloworld", // Free tier key
          url: imageUrl,
          language: "eng",
          isOverlayRequired: "false",
          detectOrientation: "true",
          scale: "true",
          OCREngine: "2",
        }),
      })

      if (!response.ok) {
        throw new Error(`OCR API error: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.IsErroredOnProcessing) {
        throw new Error(`OCR processing error: ${data.ErrorMessage}`)
      }

      const extractedText = data.ParsedResults?.[0]?.ParsedText || ""
      const processingTime = Date.now() - startTime

      // Apply rule-based extraction to OCR text
      const extracted = this.extractFromText(extractedText)

      return {
        ...extracted,
        method: "ocr",
        processing_time_ms: processingTime,
        raw_data: {
          ocr_text: extractedText,
        },
      }
    } catch (error) {
      console.error("OCR extraction failed:", error)
      throw new Error(`OCR extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  private extractFromText(text: string): Omit<ExtractionResult, "method" | "processing_time_ms" | "raw_data"> {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)

    // Common brand patterns
    const brands = [
      "whirlpool",
      "samsung",
      "lg",
      "ge",
      "maytag",
      "kenmore",
      "frigidaire",
      "bosch",
      "electrolux",
      "haier",
    ]
    const brandPattern = new RegExp(`\\b(${brands.join("|")})\\b`, "i")

    // Model number patterns (alphanumeric codes)
    const modelPattern = /\b[A-Z]{1,4}[0-9]{2,6}[A-Z]?\b|\b[0-9]{3,6}[A-Z]{1,3}\b/g

    // Serial number patterns (longer alphanumeric codes)
    const serialPattern = /\b[A-Z0-9]{8,20}\b/g

    let brand: string | undefined
    let product_family: string | undefined
    let model_number: string | undefined
    let serial_number: string | undefined

    // Extract brand
    const brandMatch = text.match(brandPattern)
    if (brandMatch) {
      brand = brandMatch[0].toLowerCase()
      brand = brand.charAt(0).toUpperCase() + brand.slice(1)
    }

    // Extract model numbers
    const modelMatches = text.match(modelPattern)
    if (modelMatches && modelMatches.length > 0) {
      model_number = modelMatches[0]
    }

    // Extract serial numbers (usually longer than model numbers)
    const serialMatches = text.match(serialPattern)
    if (serialMatches && serialMatches.length > 0) {
      // Prefer longer matches for serial numbers
      serial_number = serialMatches.sort((a, b) => b.length - a.length)[0]
    }

    // Look for product family keywords
    const familyKeywords = ["wash", "dry", "tower", "flex", "turbo", "smart", "eco", "steam"]
    for (const line of lines) {
      for (const keyword of familyKeywords) {
        if (line.toLowerCase().includes(keyword) && line.length < 50) {
          product_family = line
          break
        }
      }
      if (product_family) break
    }

    // Calculate confidence scores based on pattern matching strength
    const confidence_scores = {
      brand: brand ? 0.8 : undefined,
      product_family: product_family ? 0.6 : undefined,
      model_number: model_number ? 0.7 : undefined,
      serial_number: serial_number ? 0.7 : undefined,
    }

    return {
      brand,
      product_family,
      model_number,
      serial_number,
      confidence_scores,
    }
  }
}
