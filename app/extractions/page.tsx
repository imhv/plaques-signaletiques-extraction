import { LayoutWrapper } from "@/components/layout-wrapper";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Database } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getPredictions } from "./data.extraction";
import { ExtractionsInteractions } from "./client.extractions";

export default async function PredictionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    searchTerm?: string;
    filterMethod?: string;
  }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = parseInt(params.limit || "20");
  const searchTerm = params.searchTerm || "";
  const filterMethod = params.filterMethod || "all";

  // Récupérer les données côté serveur
  const initialData = await getPredictions({
    page,
    limit,
    searchTerm,
    filterMethod,
  });

  return (
    <LayoutWrapper>
      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader
          title="Extractions"
          description="Review and manage extraction results"
          badge={{
            text: `${initialData.predictions.length} predictions`,
            variant: "secondary",
          }}
        />

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground flex items-center gap-2">
              <Database className="h-5 w-5" />
              Filter & Search
            </CardTitle>
            <CardDescription>
              Find specific predictions and results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExtractionsInteractions
              initialData={initialData}
              searchTerm={searchTerm}
              filterMethod={filterMethod}
            />
          </CardContent>
        </Card>
      </div>
    </LayoutWrapper>
  );
}
