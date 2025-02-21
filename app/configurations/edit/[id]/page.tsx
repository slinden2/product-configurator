import React from "react";
import dynamic from "next/dynamic";
import { configSchema } from "@/validation/configSchema";
import ConfigForm from "@/components/ConfigForm";
import { getOneConfiguration } from "@/db/queries";

interface EditConfigProps {
  params: Promise<{ id: string }>;
}

const EditConfiguration = async (props: EditConfigProps) => {
  const params = await props.params;
  const configuration = await getOneConfiguration(parseInt(params.id));

  if (!configuration) {
    return <p className="text-destructive">Configurazione non trovata!</p>;
  }

  const parsedConfiguration = configSchema.parse(configuration);

  return <ConfigForm configuration={parsedConfiguration} />;
};

export default EditConfiguration;
