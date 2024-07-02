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
  });
  return configurations;
}

export type ConfigurationsForDataTable = Prisma.PromiseReturnType<
  typeof getConfigurationsForDataTable
>;
