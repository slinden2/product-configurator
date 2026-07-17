import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import AllConfigurationsTable from "@/components/all-configuration-table";
import { ActiveStatusFilter } from "@/components/shared/active-status-filter";
import { Button } from "@/components/ui/button";
import { getUserConfigurations, getUserData } from "@/db/queries";
import { canManageStandaloneConfigs } from "@/lib/access";
import { STATUS_CONFIG } from "@/lib/status-config";
import { parseConfigStatusSlug } from "@/lib/status-slugs";

const PAGE_SIZE = 20;

const Configurations = async (props: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) => {
  const user = await getUserData();
  if (!user) redirect("/login");

  if (!canManageStandaloneConfigs(user.role)) redirect("/");

  const { page: pageParam, status: statusParam } = await props.searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const statusFilter = parseConfigStatusSlug(statusParam);

  const { data: configurations, totalCount } = await getUserConfigurations(
    user,
    page,
    PAGE_SIZE,
    statusFilter,
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  if (page > totalPages) {
    const params = new URLSearchParams();
    if (statusParam && statusFilter) params.set("status", statusParam);
    params.set("page", String(totalPages));
    redirect(`/configurazioni?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">
          Configurazioni tecniche
        </h1>
        <div>
          <Link href="/configurazioni/nuova">
            <Button className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              <span>Nuova configurazione</span>
            </Button>
          </Link>
        </div>
      </div>
      {statusFilter && (
        <ActiveStatusFilter
          label={STATUS_CONFIG[statusFilter].label}
          clearHref="/configurazioni"
        />
      )}
      <AllConfigurationsTable
        configurations={configurations}
        page={page}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        user={user}
        statusSlug={statusParam}
      />
    </div>
  );
};

export default Configurations;
