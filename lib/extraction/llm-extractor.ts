import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import type { ExtractionResult } from "../types";

const extractionSchema = z.object({
  brand: z
    .string()
    .optional()
    .describe(
      "La marque ou le nom du fabricant (ex: WHIRLPOOL, SAMSUNG, LG) - TOUJOURS EN MAJUSCULES"
    ),
  product_family: z
    .string()
    .optional()
    .describe(
      "La famille de produit ou type d'appareil électroménager - TOUJOURS EN MAJUSCULES"
    ),
  model_number: z
    .string()
    .optional()
    .describe("Le numéro de modèle ou code produit"),
  serial_number: z
    .string()
    .optional()
    .describe("Le numéro de série ou identifiant unique"),
  confidence: z
    .object({
      brand: z.number().min(0).max(1).optional(),
      product_family: z.number().min(0).max(1).optional(),
      model_number: z.number().min(0).max(1).optional(),
      serial_number: z.number().min(0).max(1).optional(),
    })
    .optional()
    .describe("Scores de confiance pour chaque champ extrait (0-1)"),
});

// Ajouter un système de rate limiting
class RateLimiter {
  private requests: number[] = [];
  private tokens: number[] = [];

  constructor(
    private maxRequestsPerMinute: number = 450, // 450 pour être sûr
    private maxTokensPerMinute: number = 180000, // 180k pour être sûr
    private estimatedTokensPerRequest: number = 1500 // Estimation conservatrice
  ) {}

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Nettoyer les anciennes entrées
    this.requests = this.requests.filter((time) => time > oneMinuteAgo);
    this.tokens = this.tokens.filter((time) => time > oneMinuteAgo);

    // Vérifier les limites
    if (this.requests.length >= this.maxRequestsPerMinute) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = 60000 - (now - oldestRequest) + 1000; // +1s de marge
      console.log(`⏳ Rate limit (RPM) reached. Waiting ${waitTime}ms...`);
      await this.sleep(waitTime);
    }

    if (
      this.tokens.length >=
      this.maxTokensPerMinute / this.estimatedTokensPerRequest
    ) {
      const oldestToken = Math.min(...this.tokens);
      const waitTime = 60000 - (now - oldestToken) + 1000;
      console.log(`⏳ Rate limit (TPM) reached. Waiting ${waitTime}ms...`);
      await this.sleep(waitTime);
    }

    // Enregistrer cette requête
    this.requests.push(now);
    this.tokens.push(now);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Instance globale du rate limiter
const rateLimiter = new RateLimiter();

export async function extractWithLLM(
  imageUrl: string,
  retryCount = 0,
  model = "gpt-5"
): Promise<ExtractionResult> {
  const maxRetries = 3;
  const baseDelay = 2000; // 2 secondes

  try {
    const startTime = Date.now();
    console.log(`🤖 Starting LLM extraction at ${new Date().toISOString()}`);

    // Attendre si nécessaire pour respecter les limites
    await rateLimiter.waitIfNeeded();

    console.log(`🤖 Using model: ${model}`);

    const result = await generateObject({
      model: openai(model),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: buildExtractionPrompt(),
            },
            {
              type: "image",
              image: imageUrl,
            },
          ],
        },
      ],
      schema: extractionSchema,
    });

    const processingTime = Date.now() - startTime;
    console.log(`✅ LLM extraction completed in ${processingTime}ms`);

    // Handle case where confidence object might be undefined
    const confidence = result.object.confidence || {};

    return {
      brand: result.object.brand,
      product_family: result.object.product_family,
      model_number: result.object.model_number,
      serial_number: result.object.serial_number,
      confidence_scores: {
        brand: confidence.brand,
        product_family: confidence.product_family,
        model_number: confidence.model_number,
        serial_number: confidence.serial_number,
      },
      method: "llm",
      processing_time_ms: processingTime,
      raw_data: {
        llm_response: result.object,
      },
    };
  } catch (error) {
    console.error("LLM extraction failed:", error);

    // Gestion spécifique des erreurs de rate limiting
    if (
      error instanceof Error &&
      error.message.includes("Rate limit") &&
      retryCount < maxRetries
    ) {
      const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
      console.log(
        `🔄 Rate limit hit, retrying in ${delay}ms (attempt ${
          retryCount + 1
        }/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return extractWithLLM(imageUrl, retryCount + 1, model);
    }

    throw error;
  }
}

function buildExtractionPrompt(): string {
  return `Analysez cette image de plaque signalétique d'appareil électroménager et extrayez les informations suivantes. Dans le but d'identifier l'appareil électroménager pour donner par la suite des recommandations sur le produit.

**INFORMATIONS À EXTRAIRE :**

1. 🏷️ **MARQUE/FABRICANT**
   • Recherchez les noms de marques d'électroménager
   • Exemples : WHIRLPOOL, SAMSUNG, LG, BOSCH, MIELE, SIEMENS, ELECTROLUX, etc.
   • Format de sortie : TOUJOURS EN MAJUSCULES

2. 📱 **FAMILLE DE PRODUIT/TYPE** 
   • Identifiez le type d'appareil électroménager écrit sur la plaque ou le produit en lui même car la plaque est sur l'objet
   • Exemples français requis a recopier exactement sans modification :
     - REFRIGERATEUR | CONGELATEUR | REFRIGERATEUR CONGELATEUR
     - LAVE-LINGE | SECHE-LINGE 
     - LAVE-VAISSELLE | PLAQUE INDUCTION | FOUR | CUISINIERE
     • MICRO-ONDES | CAVE A VINS 
   • ⚠️ IMPORTANT : Si le texte est dans une autre langue, traduisez TOUJOURS en français
   • Format de sortie : TOUJOURS EN MAJUSCULES ET EN FRANÇAIS

3. 🔢 **NUMÉRO DE MODÈLE**
   • Combinaison alphanumérique identifiant le modèle
   • Mots-clés à rechercher : "Modèle", "Model", "Type", "Mod.", "Typ."
   • Exemples : MO32ECSLCROUSTY, F854G63WR, MTWA91483WFR, W614, WTB86500FF, CIS6699BPW
   • Format de sortie : Tel qu'écrit sur la plaque (respecter majuscules/minuscules)

4. 🆔 **NUMÉRO DE SÉRIE**
   • Identifiant unique de l'appareil (généralement plus long que le modèle)
   • Mots-clés à rechercher : "S/N", "SN", "Serial", "Serial Number", "N° Série", "FD"
   • Exemples : 16070000065619, 710PNXL0B738, 562208000274, 9305201359
   • ⚠️ IMPORTANT : N'incluez PAS les préfixes (sn, serial, etc.) - UNIQUEMENT le numéro

**SCORES DE CONFIANCE :**
- **0.9-1.0** : Très lisible
- **0.7-0.8** : Lisible
- **0.5-0.6** : Partiellement lisible
- **0.3-0.4** : Difficile à lire
- **0.1-0.2** : Très flou
- **0.0** : Illisible ou absent

**IMPORTANT :** 
1. N'inventez JAMAIS de données - mieux vaut NOT_FOUND qu'une erreur
2. **Précision absolue** - Recopiez EXACTEMENT ce que vous voyez, caractère par caractère
3. **Double vérification** - Relisez chaque caractère individuellement

Analysez directement l'image pour extraire ces informations.
`;
}
