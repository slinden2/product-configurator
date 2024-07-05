import { NextRequest, NextResponse } from "next/server";
import { configSchema } from "@/validation/configSchema";
import prisma from "@/prisma/db";
import { differenceInTwoArrays } from "@/lib/utils";

interface Props {
  params: { id: string };
}

export async function PATCH(request: NextRequest, { params }: Props) {
  const body = await request.json();
  const validation = configSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(validation.error.format(), { status: 400 });
  }

  const configuration = await prisma.configuration.findUnique({
    where: { id: parseInt(params.id) },
    include: { water_tanks: true, wash_bays: true },
  });

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

  await prisma.$transaction([
    prisma.configuration.update({
      where: { id: configuration.id },
      data: {
        ...configurationData,
        water_tanks: {
          create: waterTankData.added,
          deleteMany: waterTankData.removed.map((item) => ({ id: item.id })),
        },
        wash_bays: {
          create: washBayData.added,
          deleteMany: washBayData.removed.map((item) => ({ id: item.id })),
        },
      },
      select: null,
    }),
    ...waterTankData.same.map((item) => {
      return prisma.waterTank.update({
        where: {
          id: item.id,
        },
        data: item,
        select: null,
      });
    }),
    ...washBayData.same.map((item) => {
      return prisma.washBay.update({
        where: {
          id: item.id,
        },
        data: item,
        select: null,
      });
    }),
  ]);

  const response = await prisma.configuration.findUnique({
    where: { id: configuration.id },
    include: {
      water_tanks: {
        orderBy: {
          id: "asc",
        },
      },
      wash_bays: {
        orderBy: {
          id: "asc",
        },
      },
    },
  });

  return NextResponse.json(response, { status: 201 });
}
