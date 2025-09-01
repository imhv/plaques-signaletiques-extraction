"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, X, ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { validateImageFile, formatFileSize } from "@/lib/utils";

interface UploadedImage {
  id: string;
  filename: string;
  originalFilename: string;
  storagePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

interface ImageUploadProps {
  onUploadComplete?: (images: UploadedImage[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
}

export function ImageUpload({
  onUploadComplete,
  maxFiles = 10,
  maxFileSize = 1024 * 1024, // 1MB default
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setUploading(true);
      setError(null);
      setUploadProgress(0);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("User not authenticated");
        }

        // Validate all files before uploading
        for (const file of acceptedFiles) {
          const validation = await validateImageFile(file);
          if (!validation.valid) {
            throw new Error(validation.error);
          }
        }

        const uploadPromises = acceptedFiles.map(async (file, index) => {
          // Generate unique filename
          const fileExt = file.name.split(".").pop();
          const fileName = `${user.id}/${Date.now()}-${Math.random()
            .toString(36)
            .substring(2)}.${fileExt}`;

          // Upload to Supabase Storage
          const { data: storageData, error: storageError } =
            await supabase.storage
              .from("nameplate-images")
              .upload(fileName, file, {
                cacheControl: "3600",
                upsert: false,
              });

          if (storageError) throw storageError;

          // Save metadata to database
          const { data: imageData, error: dbError } = await supabase
            .from("images")
            .insert({
              user_id: user.id,
              filename: fileName,
              original_filename: file.name,
              file_size: file.size,
              mime_type: file.type,
              storage_path: storageData.path,
            })
            .select()
            .single();

          if (dbError) throw dbError;

          // Update progress
          const progress = ((index + 1) / acceptedFiles.length) * 100;
          setUploadProgress(progress);

          return imageData;
        });

        const results = await Promise.all(uploadPromises);
        const newImages = results.map((result) => ({
          id: result.id,
          filename: result.filename,
          originalFilename: result.original_filename,
          storagePath: result.storage_path,
          fileSize: result.file_size,
          mimeType: result.mime_type,
          uploadedAt: result.uploaded_at,
        }));

        setUploadedImages((prev) => [...prev, ...newImages]);
        onUploadComplete?.(newImages);
      } catch (err) {
        console.error("Upload error:", err);
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [supabase, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxFiles,
    maxSize: maxFileSize,
    disabled: uploading,
  });

  const removeImage = async (imageId: string) => {
    try {
      const imageToRemove = uploadedImages.find((img) => img.id === imageId);
      if (!imageToRemove) return;

      // Delete from storage
      await supabase.storage
        .from("nameplate-images")
        .remove([imageToRemove.storagePath]);

      // Delete from database
      await supabase.from("images").delete().eq("id", imageId);

      setUploadedImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete image");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            } ${uploading ? "pointer-events-none opacity-50" : ""}`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">
              {isDragActive ? "Drop images here" : "Upload nameplate images"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop images here, or click to select files
            </p>
            <p className="text-xs text-muted-foreground">
              Supports JPEG, PNG, WebP • Max {maxFiles} files • Max{" "}
              {formatFileSize(maxFileSize)} each
            </p>
          </div>

          {uploading && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Uploading...</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(uploadProgress)}%
                </span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
