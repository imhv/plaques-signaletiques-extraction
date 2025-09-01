import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PredictionCardSkeleton() {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-48 rounded" />
          </div>
          <Skeleton className="h-5 w-16 rounded" />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Skeleton className="h-3 w-3 rounded" />
            <Skeleton className="h-4 w-12 rounded" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-3 w-3 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Skeleton className="h-4 w-12 rounded" />
                <Skeleton className="h-4 w-12 rounded" />
              </div>
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-1 w-full rounded mt-1" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-12 rounded" />
              </div>
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-1 w-full rounded mt-1" />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-4 w-12 rounded" />
              </div>
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-1 w-full rounded mt-1" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-12 rounded" />
              </div>
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-1 w-full rounded mt-1" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Skeleton className="h-10 flex-1 rounded" />
          <Skeleton className="h-10 flex-1 rounded" />
          <Skeleton className="h-10 w-24 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}
