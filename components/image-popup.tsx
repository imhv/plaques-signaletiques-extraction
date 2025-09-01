"use client";

import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ImagePopupProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  filename: string;
}

export function ImagePopup({
  isOpen,
  onClose,
  imageUrl,
  filename,
}: ImagePopupProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
    }
  }, [isOpen]);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className=" max-h-[90vh] max-w-2xl  p-0">
        <DialogHeader className="flex flex-row items-center gap-4 p-4 border-b">
          <DialogTitle className="truncate max-w-md">{filename}</DialogTitle>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="p-4 overflow-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            {isLoading && (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
            <img
              src={imageUrl}
              alt={filename}
              className={`max-w-full max-h-[70vh] object-contain ${
                isLoading ? "hidden" : "block"
              }`}
              onLoad={handleImageLoad}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
