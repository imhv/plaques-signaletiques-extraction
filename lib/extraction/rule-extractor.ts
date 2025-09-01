import type { ExtractionResult } from "./types"

export class RuleBasedExtractor {
  async extract(text: string): Promise<ExtractionResult> {
    const startTime = Date.now()

    try {
      const extracted = this.applyRules(text)
      const processingTime = Date.now() - startTime

      return {
        ...extracted,
        method: "rule_based",
        processing_time_ms: processingTime,
        raw_data: {
          rule_matches: extracted,
        },
      }
    } catch (error) {
      console.error("Rule-based extraction failed:", error)
      throw new Error(`Rule-based extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  private applyRules(text: string): Omit<ExtractionResult, "method" | "processing_time_ms" | "raw_data"> {
    const normalizedText = text.toLowerCase().replace(/\s+/g, " ")

    // Enhanced brand detection with common variations
    const brandRules = [
      { pattern: /\b(whirlpool|whrlpool)\b/i, brand: "Whirlpool" },
      { pattern: /\b(samsung|samsng)\b/i, brand: "Samsung" },
      { pattern: /\b(lg|life'?s?\s*good)\b/i, brand: "LG" },
      { pattern: /\b(general\s*electric|ge\s*appliances?|ge)\b/i, brand: "GE" },
      { pattern: /\b(maytag|mytag)\b/i, brand: "Maytag" },
      { pattern: /\b(kenmore|knmore)\b/i, brand: "Kenmore" },
      { pattern: /\b(frigidaire|frigdaire)\b/i, brand: "Frigidaire" },
      { pattern: /\b(bosch|bsch)\b/i, brand: "Bosch" },
      { pattern: /\b(electrolux|elctrolux)\b/i, brand: "Electrolux" },
      { pattern: /\b(haier|hair)\b/i, brand: "Haier" },
    ]

    // Model number patterns (more specific)
    const modelRules = [
      // Whirlpool patterns
      { pattern: /\b(WTW|WFW|WED|WGD)[0-9]{4}[A-Z]?\w*\b/g, confidence: 0.9 },
      // Samsung patterns
      { pattern: /\b(WF|DV|WA)[0-9]{4}[A-Z]?\w*\b/g, confidence: 0.9 },
      // LG patterns
      { pattern: /\b(WT|WM|DLE|DLG)[0-9]{4}[A-Z]?\w*\b/g, confidence: 0.9 },
      // Generic patterns
      { pattern: /\b[A-Z]{2,4}[0-9]{3,6}[A-Z]?\w*\b/g, confidence: 0.7 },
      { pattern: /\b[0-9]{3,6}[A-Z]{2,4}\w*\b/g, confidence: 0.6 },
    ]

    // Serial number patterns (longer, more complex)
    const serialRules = [
      { pattern: /\b[A-Z0-9]{10,20}\b/g, confidence: 0.8 },
      { pattern: /\b[A-Z]{2}[0-9]{8,12}[A-Z0-9]*\b/g, confidence: 0.9 },
      { pattern: /\b[0-9]{8,12}[A-Z]{2,4}\b/g, confidence: 0.7 },
    ]

    // Product family patterns
    const familyRules = [
      { pattern: /\b(washtower|wash\s*tower)\b/i, family: "WashTower" },
      { pattern: /\b(flexwash|flex\s*wash)\b/i, family: "FlexWash" },
      { pattern: /\b(turbowash|turbo\s*wash)\b/i, family: "TurboWash" },
      { pattern: /\b(smartcare|smart\s*care)\b/i, family: "SmartCare" },
      { pattern: /\b(ecoboost|eco\s*boost)\b/i, family: "EcoBoost" },
      { pattern: /\b(steam\s*fresh|steamfresh)\b/i, family: "SteamFresh" },
      { pattern: /\b(quiet\s*wash|quietwash)\b/i, family: "QuietWash" },
    ]

    let brand: string | undefined
    let product_family: string | undefined
    let model_number: string | undefined
    let serial_number: string | undefined

    // Apply brand rules
    for (const rule of brandRules) {
      if (rule.pattern.test(text)) {
        brand = rule.brand
        break
      }
    }

    // Apply model number rules
    let modelConfidence = 0
    for (const rule of modelRules) {
      const matches = text.match(rule.pattern)
      if (matches && rule.confidence > modelConfidence) {
        model_number = matches[0]
        modelConfidence = rule.confidence
      }
    }

    // Apply serial number rules
    let serialConfidence = 0
    for (const rule of serialRules) {
      const matches = text.match(rule.pattern)
      if (matches && rule.confidence > serialConfidence) {
        // Prefer the longest match
        serial_number = matches.sort((a, b) => b.length - a.length)[0]
        serialConfidence = rule.confidence
      }
    }

    // Apply product family rules
    for (const rule of familyRules) {
      if (rule.pattern.test(text)) {
        product_family = rule.family
        break
      }
    }

    // Calculate confidence scores
    const confidence_scores = {
      brand: brand ? 0.85 : undefined,
      product_family: product_family ? 0.8 : undefined,
      model_number: model_number ? modelConfidence : undefined,
      serial_number: serial_number ? serialConfidence : undefined,
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
