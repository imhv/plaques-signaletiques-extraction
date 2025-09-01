import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "REVALUE - Extraction - AI-Powered Data Extraction",
  description:
    "Extract brand, model, and serial information from appliance nameplates using AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>{children}</Suspense>
      </body>
    </html>
  );
}
