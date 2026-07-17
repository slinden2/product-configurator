import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatAge } from "@/lib/utils";

interface QueueCardProps {
  title: string;
  count: number;
  oldestDate: Date | null;
  href: string;
  highlight?: boolean;
  icon?: LucideIcon;
}

export function QueueCard({
  title,
  count,
  oldestDate,
  href,
  highlight,
  icon: Icon,
}: QueueCardProps) {
  const highlightActive =
    highlight &&
    oldestDate &&
    Date.now() - oldestDate.getTime() >= 30 * 24 * 60 * 60 * 1000;

  return (
    <Link href={href} className="block">
      <Card
        className={cn(
          "transition-colors hover:bg-muted/50",
          highlightActive && "border-amber-500/50",
        )}
      >
        <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{count}</p>
          {oldestDate && count > 0 && (
            <p
              className={cn(
                "text-xs text-muted-foreground mt-1",
                highlightActive && "text-amber-600 dark:text-amber-400",
              )}
            >
              {formatAge(oldestDate)}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
