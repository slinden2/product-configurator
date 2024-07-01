import { NextRequest, NextResponse } from "next/server";
import { configSchema } from "@/validation/configSchema";
import prisma from "@/prisma/db";

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

  const newConfiguration = await prisma.configuration.create({
    data: {
      ...configurationData,
      water_tanks: { create: waterTankData },
      wash_bays: { create: washBayData },
    },
    include: {
      water_tanks: true,
      wash_bays: true,
    },
  });

  return NextResponse.json(newConfiguration, { status: 201 });
}
