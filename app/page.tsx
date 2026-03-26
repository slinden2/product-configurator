import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getConfigurationStatusCounts } from "@/db/queries";
import { STATUS_CONFIG } from "@/lib/status-config";
import { ConfigurationStatus } from "@/types";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

const Dashboard = async () => {
  const counts = await getConfigurationStatusCounts();

  if (!counts) {
    redirect("/login");
  }

  const countMap = new Map(counts.map((c) => [c.status, c.count]));
  const total = counts.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Link href="/configurations/new">
          <Button className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            <span>Nuova configurazione</span>
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ConfigurationStatus.map((status) => (
          <Card key={status}>
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: STATUS_CONFIG[status].color }}
              />
              <CardTitle className="text-sm font-medium">
                {STATUS_CONFIG[status].label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{countMap.get(status) ?? 0}</p>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Totale</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{total}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
