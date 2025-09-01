import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"
import type { ExtractionResult } from "./types"

const extractionSchema = z.object({
  brand: z.string().optional().describe("The brand or manufacturer name (e.g., Whirlpool, Samsung, LG)"),
  product_family: z.string().optional().describe("The product family or series (e.g., WashTower, FlexWash, TurboWash)"),
  model_number: z.string().optional().describe("The model number or product code"),
  serial_number: z.string().optional().describe("The serial number or unique identifier"),
  confidence: z
    .object({
      brand: z.number().min(0).max(1).optional(),
      product_family: z.number().min(0).max(1).optional(),
      model_number: z.number().min(0).max(1).optional(),
      serial_number: z.number().min(0).max(1).optional(),
    })
    .describe("Confidence scores for each extracted field (0-1)"),
})

export class LLMExtractor {
  async extract(imageUrl: string): Promise<ExtractionResult> {
    const startTime = Date.now()

    try {
      const result = await generateObject({
        model: openai("gpt-4o-mini"),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this nameplate image from an appliance (washing machine, dryer, etc.) and extract the following information:

1. Brand/Manufacturer name
2. Product family or series name
3. Model number
4. Serial number

Look for text that appears on labels, stickers, or printed directly on the appliance. Common locations include:
- Main product labels
- Rating plates
- Serial number stickers
- Model identification areas

Provide confidence scores (0-1) for each field based on how clearly visible and certain the text is.

If text is unclear, partially obscured, or ambiguous, reflect this in lower confidence scores.`,
              },
              {
                type: "image",
                image: imageUrl,
              },
            ],
          },
        ],
        schema: extractionSchema,
        temperature: 0.1, // Low temperature for consistent extraction
      })

      const processingTime = Date.now() - startTime

      return {
        brand: result.object.brand,
        product_family: result.object.product_family,
        model_number: result.object.model_number,
        serial_number: result.object.serial_number,
        confidence_scores: {
          brand: result.object.confidence.brand,
          product_family: result.object.confidence.product_family,
          model_number: result.object.confidence.model_number,
          serial_number: result.object.confidence.serial_number,
        },
        method: "llm",
        processing_time_ms: processingTime,
        raw_data: {
          llm_response: result.object,
        },
      }
    } catch (error) {
      console.error("LLM extraction failed:", error)
      throw new Error(`LLM extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
}
