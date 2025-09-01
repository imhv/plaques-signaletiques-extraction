import { Badge } from "@/components/ui/badge";

interface PageHeaderProps {
  title: string;
  description: string;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  centered?: boolean;
}

export function PageHeader({
  title,
  description,
  badge,
  centered = false,
}: PageHeaderProps) {
  if (centered) {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-muted-foreground mt-2 text-balance">{description}</p>
        {badge && (
          <div className="mt-4">
            <Badge variant={badge.variant || "secondary"} className="text-sm">
              {badge.text}
            </Badge>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
      {badge && (
        <Badge variant={badge.variant || "secondary"} className="text-sm">
          {badge.text}
        </Badge>
      )}
    </div>
  );
}
