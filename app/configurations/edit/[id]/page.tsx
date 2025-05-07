import React from "react";
import { updateConfigSchema } from "@/validation/config-schema";
import { getConfigurationWithTanksAndBays } from "@/db/queries";
import FormContainer from "@/components/form-container";
import { updateWaterTankSchema } from "@/validation/water-tank-schema";
import { transformDbNullToUndefined } from "@/db/transformations";
import { updateWashBaySchema } from "@/validation/wash-bay-schema";
import StatusForm from "@/components/status-form";

interface EditConfigProps {
  params: Promise<{ id: string }>;
}

const EditConfiguration = async (props: EditConfigProps) => {
  const params = await props.params;
  const id = parseInt(params.id);
  const configurationData = await getConfigurationWithTanksAndBays(id);

  console.log("configurationData :>> ", configurationData); // DEBUG

  if (!configurationData) {
    return <p className="text-destructive">Configurazione non trovata!</p>;
  }

  const { water_tanks, wash_bays, ...configuration } = configurationData;

  const transformedConfigurationData =
    transformDbNullToUndefined(configuration);

  const validatedConfiguration = updateConfigSchema.parse(
    transformedConfigurationData
  );
  const validatedWaterTanks = water_tanks.map((wt) =>
    updateWaterTankSchema.parse(transformDbNullToUndefined(wt))
  );
  const validatedWashBays = wash_bays.map((wb) =>
    updateWashBaySchema.parse(transformDbNullToUndefined(wb))
  );

  return (
    <div>
      <div className="flex mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Modifica Configurazione</h1>
          <p className="text-muted-foreground">
            Modifica con il form sottostante la configurazione del tuo cliente.
          </p>
        </div>
        <div className="ml-auto flex justify-center items-center">
          <StatusForm confId={id} initialStatus={configuration.status} />
        </div>
      </div>
      <FormContainer
        confId={id}
        configuration={validatedConfiguration}
        initialWaterTanks={validatedWaterTanks}
        initialWashBays={validatedWashBays}
      />
    </div>
  );
};

export default EditConfiguration;
