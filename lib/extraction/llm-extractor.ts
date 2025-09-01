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
  retryCount = 0
): Promise<ExtractionResult> {
  const maxRetries = 3;
  const baseDelay = 2000; // 2 secondes

  try {
    const startTime = Date.now();
    console.log(`🤖 Starting LLM extraction at ${new Date().toISOString()}`);

    // Attendre si nécessaire pour respecter les limites
    await rateLimiter.waitIfNeeded();

    const result = await generateObject({
      model: openai("gpt-5-mini"),
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
      return extractWithLLM(imageUrl, retryCount + 1);
    }

    throw error;
  }
}

function buildExtractionPrompt(): string {
  return `Analysez cette image de plaque signalétique d'appareil électroménager et extrayez les informations suivantes.

    **INFORMATIONS À EXTRAIRE :**
1. **Marque/Fabricant** - Recherchez les noms d'entreprises comme Whirlpool, Samsung, LG, Bosch, Miele, etc.
2. **Famille de produit/Type** - Le champ le plus important. Recherchez les termes qui indiquent le type d'appareil
3. **Numéro de modèle** - Généralement une combinaison de lettres et de chiffres. souvent après modèle, model, type..
4. **Numéro de série** - Identifiant unique, souvent plus long que les numéros de modèle. souvent après nr, serial, serial number, serial#

**RÈGLES D'EXTRACTION DES FAMILLES DE PRODUITS : **
exemple : REFRIGERATEUR, CONGELATEUR, REFRIGERATEUR CONGELATEUR, LAVE-LINGE, SECHE-LINGE, LAVE-VAISSELLE, PLAQUE INDUCTION, FOUR, CUISINIERE, MICRO-ONDES, CAVE A VINS...
Attention le peut etre dans une autre langue toujours la donner en FRANCAIS comme ci desssus.


**RÈGLES SPÉCIALES POUR LES NUMÉROS DE SÉRIE :**
1. **Longueur typique** - Généralement 8-20 caractères
2. **Format courant** - Souvent tout en chiffres ou mélange lettres/chiffres
3. **Attention aux erreurs courantes** :
   - Ne pas tronquer les numéros longs
   - Ne pas ajouter des chiffres qui ne sont pas là
   - N'écris pas sn, serial number, serial# mais le numéro de série lui meme

**RÈGLES DE TRANSCRIPTION CRITIQUES :**
1. **Caractères similaires** - Faites très attention à :
   - O (lettre) vs 0 (zéro) - Dans les codes, souvent des zéros
   - I (lettre) vs 1 (un) - Dans les codes, souvent des uns
   - S vs 5, G vs 6, B vs 8
   - Vérifiez le contexte : les numéros de série sont souvent tout en chiffres
2. **Précision absolue** - Recopiez EXACTEMENT ce que vous voyez, caractère par caractère
3. **Double vérification** - Relisez chaque caractère individuellement

**SCORES DE CONFIANCE :**
- **0.9-1.0** : Texte très clair, parfaitement lisible
- **0.7-0.8** : Texte lisible avec quelques incertitudes mineures
- **0.5-0.6** : Texte partiellement lisible, quelques caractères incertains
- **0.3-0.4** : Texte difficile à lire, plusieurs caractères incertains
- **0.1-0.2** : Texte très flou, extraction incertaine
- **0.0** : Impossible à lire ou pas trouvé

**IMPORTANT :** 
1. N'inventez JAMAIS de données - mieux vaut NOT_FOUND qu'une erreur
2. **Précision absolue** - Recopiez EXACTEMENT ce que vous voyez, caractère par caractère
3. **Double vérification** - Relisez chaque caractère individuellement

Analysez directement l'image pour extraire ces informations.
`;
}
