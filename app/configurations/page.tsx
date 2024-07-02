import DataTable from "@/components/DataTable";
import { getConfigurationsForDataTable } from "@/prisma/db";
import React from "react";

const Configurations = async () => {
  const configurations = await getConfigurationsForDataTable();

  return <DataTable configurations={configurations} />;
};

export default Configurations;
