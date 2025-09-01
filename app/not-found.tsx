"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { Home, ArrowLeft, Search, Upload, Database } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-4xl h-screen flex items-center justify-center mx-auto">
      <div className="text-center  items-center justify-center space-y-8">
        {/* Illustration and main title */}
        <div className="space-y-6">
          <div className="mx-auto w-32 h-32 bg-muted rounded-full flex items-center justify-center">
            <Search className="w-16 h-16 text-muted-foreground" />
          </div>

          <div className="space-y-4">
            <h1 className="text-6xl font-bold text-foreground">404</h1>
            <h2 className="text-2xl font-semibold text-foreground">
              Page Not Found
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Sorry, the page you are looking for does not exist or has been
              moved. Check the URL or use the links below to navigate.
            </p>
          </div>
        </div>

        {/* Main Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="javascript:history.back()">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous Page
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
