import { Prisma, PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;

const configurationSelect = Prisma.validator<Prisma.ConfigurationSelect>()({
  id: true,
  status: true,
  name: true,
  description: true,
  created_at: true,
  updated_at: true,
});

export async function getConfigurationsForDataTable() {
  const configurations = await prisma.configuration.findMany({
    select: configurationSelect,
    orderBy: { updated_at: "desc" },
  });
  return configurations;
}

export type ConfigurationsForDataTable = Prisma.PromiseReturnType<
  typeof getConfigurationsForDataTable
>;

export async function getConfiguration(id: string) {
  const configuration = await prisma.configuration.findUnique({
    where: { id: parseInt(id) },
    include: {
      water_tanks: true,
      wash_bays: true,
    },
  });
  return configuration;
}
