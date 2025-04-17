import React from "react";
import { updateConfigSchema } from "@/validation/config-schema";
import { getConfigurationWithTanksAndBays } from "@/db/queries";
import FormContainer from "@/components/form-container";
import { updateWaterTankSchema } from "@/validation/water-tank-schema";

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
  const validatedWaterTanks = water_tanks.map((wt) =>
    updateWaterTankSchema.parse(wt)
  );

  return (
    <FormContainer
      confId={id}
      configuration={validatedConfiguration}
      existingWaterTanks={validatedWaterTanks}
    />
  );
};

export default EditConfiguration;
