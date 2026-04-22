import { notFound, redirect } from "next/navigation";
import ConfigNavigationBar from "@/components/config-navigation-bar";
import FormContainer from "@/components/form-container";
import StatusForm from "@/components/status-form";
import {
  getConfigurationWithTanksAndBays,
  getUserData,
  hasEngineeringBom,
} from "@/db/queries";
import { transformDbNullToUndefined } from "@/db/transformations";
import {
  type UpdateConfigSchema,
  updateConfigSchema,
} from "@/validation/config-schema";
import {
  type UpdateWashBaySchema,
  updateWashBaySchema,
} from "@/validation/wash-bay-schema";
import {
  type UpdateWaterTankSchema,
  updateWaterTankSchema,
} from "@/validation/water-tank-schema";

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

  // Use safeParse so stale enum values or removed fields don't crash the page.
  // Invalid data passes through as-is; the client form runs trigger() on mount
  // and shows the affected fields in red so the user knows what to fix.
  const configParsed = updateConfigSchema.safeParse(
    transformedConfigurationData,
  );
  const validatedConfiguration: UpdateConfigSchema = configParsed.success
    ? configParsed.data
    : (transformedConfigurationData as unknown as UpdateConfigSchema);

  const validatedWaterTanks: UpdateWaterTankSchema[] = water_tanks.map((wt) => {
    const raw = transformDbNullToUndefined(wt);
    const parsed = updateWaterTankSchema.safeParse(raw);
    return parsed.success
      ? parsed.data
      : (raw as unknown as UpdateWaterTankSchema);
  });

  const validatedWashBays: UpdateWashBaySchema[] = wash_bays.map((wb) => {
    const raw = transformDbNullToUndefined(wb);
    const parsed = updateWashBaySchema.safeParse(raw);
    return parsed.success
      ? parsed.data
      : (raw as unknown as UpdateWashBaySchema);
  });

  const ebomExists = await hasEngineeringBom(id);

  return (
    <div>
      <ConfigNavigationBar confId={id} activePage="edit" role={user.role} />
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
