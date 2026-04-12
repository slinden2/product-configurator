import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import AllConfigurationsTable from "@/components/all-configuration-table";
import { Button } from "@/components/ui/button";
import { getUserConfigurations, getUserData } from "@/db/queries";

const PAGE_SIZE = 20;

const Configurations = async (props: {
  searchParams: Promise<{ page?: string }>;
}) => {
  const user = await getUserData();
  if (!user) redirect("/login");

  const { page: pageParam } = await props.searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const { data: configurations, totalCount } = await getUserConfigurations(
    user,
    page,
    PAGE_SIZE,
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  if (page > totalPages) {
    redirect(`/configurazioni?page=${totalPages}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Configurazioni</h1>
        <div>
          <Link href="/configurazioni/nuova">
            <Button className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              <span>Nuova configurazione</span>
            </Button>
          </Link>
        </div>
      </div>
      <AllConfigurationsTable
        configurations={configurations}
        page={page}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
};

export default Configurations;
