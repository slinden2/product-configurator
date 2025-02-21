import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { getAllConfigurations } from "@/db/queries";
import { CirclePlus } from "lucide-react";
import Link from "next/link";
import React from "react";

const Configurations = async () => {
  const configurations = await getAllConfigurations();

  return (
    <div className="space-y-3">
      <DataTable configurations={configurations} />
      <div>
        <Link href="/configurations/new">
          <Button variant="default" size="icon" title="Nuova configurazione">
            <CirclePlus />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Configurations;
