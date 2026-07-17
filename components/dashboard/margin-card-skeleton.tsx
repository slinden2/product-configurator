import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export function MarginCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Decisioni margine</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-8">
        <Spinner size="medium" />
      </CardContent>
    </Card>
  );
}
