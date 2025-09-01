import sharp from "sharp";
import { fetch } from "undici";

export const runtime = "nodejs";

export interface PreprocessOptions {
  imageUrl: string;
  returnType?: "png" | "jpeg" | "json";
}

export interface PreprocessResult {
  processedImageBuffer?: Buffer;
  debugInfo?: {
    autoThreshold: number;
    width: number;
    height: number;
    upscaled: boolean;
  };
}

export async function preprocessImage(
  options: PreprocessOptions
): Promise<PreprocessResult> {
  const { imageUrl, returnType = "png" } = options;

  const resp = await fetch(imageUrl);
  if (!resp.ok) throw new Error("Failed to fetch image");
  const input = Buffer.from(await resp.arrayBuffer());

  // 1) Auto-orientation (EXIF) + passage en niveaux de gris
  let img = sharp(input, { unlimited: true }).rotate().grayscale(); // auto-EXIF + gris

  // 2) Normalisation globale + débruitage léger AVANT sharpen
  img = img.normalize().median(3);

  // 3) Netteté propre (unsharp contrôlé)
  // sharpen(sigma, flat, jagged) ; commence modéré pour éviter halos
  img = img.sharpen(1.1, 1, 1);

  // 4) Légère modulation perceptuelle (luminosité/contraste)
  // brightness ~1.05–1.15 selon dataset ; lightness ajoute un offset
  img = img.modulate({ brightness: 1.08, lightness: 1.0 });

  // 5) Upscale si trop petit (meilleure lisibilité des glyphes)
  const meta0 = await img.metadata();
  const minDim = Math.min(meta0.width ?? 0, meta0.height ?? 0);
  const shouldUpscale = minDim > 0 && minDim < 900;
  if (shouldUpscale) {
    const scale = Math.ceil(900 / minDim);
    img = img.resize((meta0.width ?? 0) * scale, (meta0.height ?? 0) * scale, {
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
    });
  }

  // 6) Seuil automatique (type Otsu) via histogramme Sharp
  //    Sharp ne fournit pas directement l'histogramme via stats()
  //    Utilisons un seuil fixe optimisé ou calculons via raw pixel data
  const thr = 128; // Seuil par défaut, peut être ajusté selon les besoins

  // 7) Application du seuil binaire
  img = img.threshold(thr);

  // 8) Sortie
  const meta = await img.metadata();
  const out =
    returnType === "jpeg"
      ? await img.jpeg({ quality: 90, mozjpeg: true }).toBuffer()
      : returnType === "png"
      ? await img.png({ compressionLevel: 6 }).toBuffer()
      : undefined;

  return returnType === "json"
    ? {
        debugInfo: {
          autoThreshold: thr,
          width: meta.width ?? 0,
          height: meta.height ?? 0,
          upscaled: shouldUpscale,
        },
      }
    : { processedImageBuffer: out };
}
