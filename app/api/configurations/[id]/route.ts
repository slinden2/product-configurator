import { NextRequest, NextResponse } from "next/server";
import { configSchema } from "@/validation/config-schema";
import { differenceInTwoArrays } from "@/lib/utils";
import {
  getOneConfiguration,
  getUserData,
  QueryError,
  updateConfiguration,
} from "@/db/queries";
import { DatabaseError } from "pg";

interface Props {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, props: Props) {
  const user = await getUserData();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await props.params;
  const body = await request.json();
  const validation = configSchema.safeParse(body);
  console.log(validation.error);

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

  if (configuration.user_id !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  try {
    const response = await updateConfiguration(
      configurationData,
      waterTankData,
      washBayData
    );

    return NextResponse.json(
      {
        message: `Configurazione (id=${response.id}) aggiornata.`,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof QueryError) {
      return NextResponse.json(
        {
          message: err.message,
        },
        { status: err.errorCode }
      );
    }

    if (err instanceof DatabaseError) {
      return NextResponse.json(
        { code: err.code, message: err.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Errore sconosciuto",
      },
      { status: 500 }
    );
  }
}
