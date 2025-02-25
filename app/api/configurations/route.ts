import { NextRequest, NextResponse } from "next/server";
import { configSchema } from "@/validation/configSchema";
import { insertConfiguration, QueryError } from "@/db/queries";
import { DatabaseError } from "pg";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const validation = configSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(validation.error.format(), { status: 400 });
  }

  const {
    water_tanks: waterTankData,
    wash_bays: washBayData,
    ...configurationData
  } = validation.data;

  try {
    const response = await insertConfiguration(
      configurationData,
      waterTankData,
      washBayData
    );
    return NextResponse.json(response, { status: 201 });
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

    if (err instanceof Error) {
      console.error("Unknown error: ", err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
}
