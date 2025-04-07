import AllConfigurationsTable from "@/components/all-configuration-table";
import { Button } from "@/components/ui/button";
import { getUserConfigurations } from "@/db/queries";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import React from "react";

const Configurations = async () => {
  const configurations = await getUserConfigurations();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Configurazioni</h1>
        <div>
          <Link href="/configurations/new">
            <Button className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              <span>Nuova configurazione</span>
            </Button>
          </Link>
        </div>
      </div>
      <AllConfigurationsTable configurations={configurations} />
    </div>
  );
};

export default Configurations;
