import { NextRequest, NextResponse } from "next/server";
import { configSchema } from "@/validation/configSchema";
import { insertConfiguration } from "@/db/queries";
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
  } = body;

  try {
    const response = await insertConfiguration(
      configurationData,
      waterTankData,
      washBayData
    );
    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    if (err instanceof DatabaseError) {
      console.error(err);
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
