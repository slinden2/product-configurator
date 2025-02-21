import { NextRequest, NextResponse } from "next/server";
import { configSchema } from "@/validation/configSchema";
import { differenceInTwoArrays } from "@/lib/utils";
import { getOneConfiguration, updateConfiguration } from "@/db/queries";

interface Props {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, props: Props) {
  const params = await props.params;
  const body = await request.json();
  const validation = configSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(validation.error.format(), { status: 400 });
  }

  const configuration = await getOneConfiguration(parseInt(params.id));

  if (!configuration) {
    return NextResponse.json(
      { error: "Configurazione non trovata" },
      { status: 404 }
    );
  }

  const { water_tanks, wash_bays, ...configurationData } = body;

  const waterTankData = differenceInTwoArrays(
    configuration.water_tanks,
    body.water_tanks as typeof configuration.water_tanks
  );

  const washBayData = differenceInTwoArrays(
    configuration.wash_bays,
    body.wash_bays as typeof configuration.wash_bays
  );

  const response = await updateConfiguration(
    configurationData,
    waterTankData,
    washBayData
  );

  return NextResponse.json(
    { message: `Configurazione (id=${response.id}) aggiornata` },
    { status: 201 }
  );
}
