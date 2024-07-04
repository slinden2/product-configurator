import React from "react";
import dynamic from "next/dynamic";
import { getConfiguration } from "@/prisma/db";
import { configSchema } from "@/validation/configSchema";

const ConfigForm = dynamic(() => import("@/components/ConfigForm"), {
  ssr: false,
});

interface EditConfigProps {
  params: { id: string };
}

const EditConfiguration = async ({ params }: EditConfigProps) => {
  const configuration = await getConfiguration(params.id);

  if (!configuration) {
    return <p className="text-destructive">Configurazione non trovata!</p>;
  }

  const parsedConfiguration = configSchema.parse(configuration);

  return <ConfigForm configuration={parsedConfiguration} />;
};

export default EditConfiguration;
