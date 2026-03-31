import AllConfigurationsTable from "@/components/all-configuration-table";
import { Button } from "@/components/ui/button";
import { getUserConfigurations, getUserData } from "@/db/queries";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import React from "react";

const Configurations = async () => {
  const user = await getUserData();
  if (!user) redirect("/login");
  const configurations = await getUserConfigurations(user);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
