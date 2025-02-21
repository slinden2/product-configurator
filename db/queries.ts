import { db } from "@/db";
import {
  configurations,
  waterTanks,
  washBays,
  type NewConfiguration,
  type Configuration,
  type NewWaterTank,
  type NewWashBay,
  type WaterTank,
  type WashBay,
} from "@/db/schemas";
import { ArrayDifferenceOutput } from "@/lib/utils";
import { BOM } from "@/lib/BOM";
import { desc, eq, inArray, is, sql, SQL } from "drizzle-orm";
import { PgBoolean, PgEnumColumn, PgInteger } from "drizzle-orm/pg-core";

export type DatabaseType = typeof db;
export type TransactionType = Parameters<
  Parameters<DatabaseType["transaction"]>[0]
>[0];

export type AllConfigurations = Awaited<
  ReturnType<typeof getAllConfigurations>
>;

export type OneConfiguration = Awaited<ReturnType<typeof getOneConfiguration>>;

export async function getAllConfigurations() {
  const response = await db.query.configurations.findMany({
    columns: {
      id: true,
      status: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
    },
    orderBy: [desc(configurations.updated_at)],
  });

  return response;
}

export async function getOneConfiguration(id: number) {
  const response = await db.query.configurations.findFirst({
    where: eq(configurations.id, id),
    with: {
      water_tanks: true,
      wash_bays: true,
    },
  });
  return response;
}

export const insertConfiguration = async (
  newConfiguration: NewConfiguration,
  newWaterTanks: Omit<NewWaterTank, "configuration_id">[],
  newWashBays: Omit<NewWashBay, "configuration_id">[]
) => {
  const result = await db.transaction(async (tx) => {
    const [createdConfiguration] = await tx
      .insert(configurations)
      .values(newConfiguration)
      .returning({ id: configurations.id });

    let createdWaterTanks: { id: number }[] | null = null;
    if (newWaterTanks.length > 0) {
      const newWaterTanksWithConfId = newWaterTanks.map((wt) => ({
        ...wt,
        configuration_id: createdConfiguration.id,
      }));

      createdWaterTanks = await tx
        .insert(waterTanks)
        .values(newWaterTanksWithConfId)
        .returning({ id: waterTanks.id });
    }

    let createdWashBays: { id: number }[] | null = null;
    if (newWashBays.length > 0) {
      const newWashBaysWithConfId = newWashBays.map((wb) => ({
        ...wb,
        configuration_id: createdConfiguration.id,
      }));

      createdWashBays = await tx
        .insert(washBays)
        .values(newWashBaysWithConfId)
        .returning({ id: washBays.id });
    }

    return {
      createdConfiguration,
      createdWaterTanks,
      createdWashBays,
    };
  });

  return result;
};

async function insertRows<T>(
  tx: TransactionType,
  table: any,
  itemsToCreate: T[],
  configurationId: number
) {
  if (itemsToCreate.length === 0) return null;

  const itemsToCreateWithConfId = itemsToCreate.map((item) => ({
    ...item,
    configuration_id: configurationId,
  }));
  await tx.insert(table).values(itemsToCreateWithConfId);
}

async function updateRows<T extends { id: number }>(
  tx: TransactionType,
  table: any,
  itemsToModify: T[]
) {
  if (itemsToModify.length === 0) return null;

  const ids: number[] = [];
  const columnsToUpdate = Object.keys(itemsToModify[0]).filter(
    (col) => col !== "id"
  );
  const setClauses: Record<string, SQL> = {};

  columnsToUpdate.forEach((col) => {
    const sqlChunks: SQL[] = [sql`(case`];

    const isEnumColumn = is(table[col], PgEnumColumn);
    const isIntegerColumn = is(table[col], PgInteger);
    const isBooleanColumn = is(table[col], PgBoolean);

    itemsToModify.forEach((item) => {
      let value: SQL;
      const columnValue = (item as any)[col];

      if (isEnumColumn) {
        const enumName = table[col].enum.enumName;
        value = sql.raw(`'${columnValue}'::${enumName}`);
      } else if (isIntegerColumn) {
        value = sql.raw(`${columnValue}::int`);
      } else if (isBooleanColumn) {
        value = sql.raw(`${columnValue}::boolean`);
      } else {
        value = sql`${columnValue}`;
      }

      sqlChunks.push(sql`when ${table.id} = ${item.id} then ${value}`);

      ids.push(item.id);
    });

    sqlChunks.push(sql`end)`);

    setClauses[col] = sql.join(sqlChunks, sql.raw(" "));
  });

  await tx
    .update(table)
    .set(setClauses)
    .where(inArray(table.id, [...new Set(ids)]));
}

async function deleteRows<T extends { id: number }>(
  tx: TransactionType,
  table: any,
  itemsToRemove: T[],
  idField: any
) {
  if (itemsToRemove.length === 0) return null;

  await tx.delete(table).where(
    inArray(
      idField,
      itemsToRemove.map((item) => item.id)
    )
  );
}

export const updateConfiguration = async (
  configurationData: Configuration,
  waterTankData: ArrayDifferenceOutput<WaterTank>,
  washBayData: ArrayDifferenceOutput<WashBay>
): Promise<{ id: number }> => {
  const updatedConfiguration = await db.transaction(async (tx) => {
    const {
      id,
      ...configurationDataWithoutId
    }: { id: number } & Omit<Configuration, "id"> = configurationData;

    const [updatedConfiguration] = await tx
      .update(configurations)
      .set(configurationDataWithoutId)
      .where(eq(configurations.id, id))
      .returning({ id: configurations.id });

    console.log("updatedConfiguration :>> ", updatedConfiguration);

    await insertRows(
      tx,
      waterTanks,
      waterTankData.added,
      updatedConfiguration.id
    );
    await insertRows(tx, washBays, washBayData.added, updatedConfiguration.id);

    await deleteRows(tx, waterTanks, waterTankData.removed, waterTanks.id);
    await deleteRows(tx, washBays, washBayData.removed, washBays.id);

    await updateRows(tx, waterTanks, waterTankData.same);
    await updateRows(tx, washBays, washBayData.same);

    return updatedConfiguration;
  });
  return updatedConfiguration;
};

export async function getBOM(id: number) {
  const configuration = await getOneConfiguration(id);
  if (configuration) {
    const bom = await BOM.init(configuration);
    return bom;
  }
}
