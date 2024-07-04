import DataTable from "@/components/DataTable";
import { buttonVariants } from "@/components/ui/button";
import { getConfigurationsForDataTable } from "@/prisma/db";
import Link from "next/link";
import React from "react";

const Configurations = async () => {
  const configurations = await getConfigurationsForDataTable();

  return (
    <div className="space-y-6">
      <DataTable configurations={configurations} />
      <Link
        className={buttonVariants({ variant: "default" })}
        href="/configurations/new">
        Nuova configurazione
      </Link>
    </div>
  );
};

export default Configurations;
