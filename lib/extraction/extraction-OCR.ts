export class OCRExtractor {
  // Méthode principale pour extraire le texte brut
  async extractRawText(
    imageUrl: string
  ): Promise<{ raw_text: string; processing_time_ms: number }> {
    const startTime = Date.now();
    const apiKey = process.env.OCR_SPACE_API_KEY;

    if (!apiKey) {
      throw new Error("OCR_SPACE_API_KEY environment variable is not set");
    }

    try {
      // Check file size before processing
      await this.validateImageSize(imageUrl);

      // Use a web-based OCR service (OCR.space API as example)
      const response = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        headers: {
          apikey: apiKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          url: imageUrl,
          language: "eng",
          isOverlayRequired: "false",
          detectOrientation: "true",
          scale: "true",
          OCREngine: "2",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `OCR API error: ${response.status} ${response.statusText}`
        );
        console.error(`Response body: ${errorText}`);
        throw new Error(
          `OCR API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();

      if (data.IsErroredOnProcessing) {
        throw new Error(`OCR processing error: ${data.ErrorMessage}`);
      }

      const extractedText = data.ParsedResults?.[0]?.ParsedText || "";
      const processingTime = Date.now() - startTime;

      return {
        raw_text: extractedText,
        processing_time_ms: processingTime,
      };
    } catch (error) {
      console.error("OCR extraction failed:", error);
      throw new Error(
        `OCR extraction failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private async validateImageSize(imageUrl: string): Promise<void> {
    try {
      const response = await fetch(imageUrl, { method: "HEAD" });
      if (!response.ok) {
        throw new Error(
          `Failed to fetch image headers: ${response.statusText}`
        );
      }

      const contentLength = response.headers.get("content-length");
      if (contentLength) {
        const fileSizeInKB = parseInt(contentLength) / 1024;
        if (fileSizeInKB > 1024) {
          throw new Error(
            `Image file size (${fileSizeInKB.toFixed(
              1
            )} KB) exceeds the maximum limit of 1024 KB. Please compress the image or use a smaller file.`
          );
        }
      }
    } catch (error) {
      // If we can't validate the size, log a warning but continue
      console.warn("Could not validate image size:", error);
    }
  }
}
