import { updateConfigSchema } from "@/validation/config-schema";
import {
  getConfigurationWithTanksAndBays,
  getUserData,
  hasEngineeringBom,
} from "@/db/queries";
import FormContainer from "@/components/form-container";
import { updateWaterTankSchema } from "@/validation/water-tank-schema";
import { transformDbNullToUndefined } from "@/db/transformations";
import { updateWashBaySchema } from "@/validation/wash-bay-schema";
import StatusForm from "@/components/status-form";
import ConfigNavigationBar from "@/components/config-navigation-bar";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";

interface EditConfigProps {
  params: Promise<{ id: string }>;
}

const EditConfiguration = async (props: EditConfigProps) => {
  const params = await props.params;
  const id = parseInt(params.id, 10);
  if (Number.isNaN(id)) notFound();

  const user = await getUserData();
  if (!user) redirect("/login");

  const configurationData = await getConfigurationWithTanksAndBays(id, user);
  if (!configurationData) notFound();

  const { water_tanks, wash_bays, ...configuration } = configurationData;

  const transformedConfigurationData =
    transformDbNullToUndefined(configuration);

  const validatedConfiguration = updateConfigSchema.parse(
    transformedConfigurationData,
  );
  const validatedWaterTanks = water_tanks.map((wt) =>
    updateWaterTankSchema.parse(transformDbNullToUndefined(wt)),
  );
  const validatedWashBays = wash_bays.map((wb) =>
    updateWashBaySchema.parse(transformDbNullToUndefined(wb)),
  );

  const ebomExists = await hasEngineeringBom(id);

  return (
    <div>
      <ConfigNavigationBar confId={id} activePage="edit" />
      <div className="mb-6 sm:flex sm:gap-2">
        <div className="mb-6 sm:mb-0">
          <h1 className="text-3xl font-bold mb-2">Modifica configurazione</h1>
          <p className="text-muted-foreground">
            Modifica con il form sottostante la configurazione del tuo cliente.
          </p>
        </div>
        <div className="sm:ml-auto sm:flex sm:justify-center sm:items-center">
          <StatusForm
            confId={id}
            initialStatus={configuration.status}
            userRole={user.role}
          />
        </div>
      </div>
      <FormContainer
        confId={id}
        configuration={validatedConfiguration}
        confStatus={configuration.status}
        userRole={user.role}
        initialWaterTanks={validatedWaterTanks}
        initialWashBays={validatedWashBays}
        hasEngineeringBom={ebomExists}
      />
    </div>
  );
};

export default EditConfiguration;
