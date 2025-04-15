import React from "react";
import { updateConfigSchema } from "@/validation/config-schema";
import { getConfigurationWithTanksAndBays } from "@/db/queries";
import FormContainer from "@/components/form-container";

interface EditConfigProps {
  params: Promise<{ id: string }>;
}

const EditConfiguration = async (props: EditConfigProps) => {
  const params = await props.params;
  const id = parseInt(params.id);
  const configurationData = await getConfigurationWithTanksAndBays(id);

  if (!configurationData) {
    return <p className="text-destructive">Configurazione non trovata!</p>;
  }

  const { water_tanks, wash_bays, ...configuration } = configurationData;

  const validatedConfiguration = updateConfigSchema.parse(configuration);

  return <FormContainer id={id} configuration={validatedConfiguration} />;
};

export default EditConfiguration;
