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
  userProfiles,
} from "@/db/schemas";
import { ArrayDifferenceOutput } from "@/lib/utils";
import { BOM } from "@/lib/BOM";
import { and, desc, eq, inArray, is, sql, SQL } from "drizzle-orm";
import { PgBoolean, PgEnumColumn, PgInteger } from "drizzle-orm/pg-core";
import { createClient } from "@/utils/supabase/server";

export type DatabaseType = typeof db;
export type TransactionType = Parameters<
  Parameters<DatabaseType["transaction"]>[0]
>[0];

export type AllConfigurations = Awaited<
  ReturnType<typeof getUserConfigurations>
>;

export type OneConfiguration = Awaited<ReturnType<typeof getOneConfiguration>>;

export type UserData = Awaited<ReturnType<typeof getUserData>>;

export class QueryError extends Error {
  errorCode: number;

  constructor(message: string, errorCode: number) {
    super(message);
    this.name = "QueryError";
    this.errorCode = errorCode;

    Object.setPrototypeOf(this, QueryError.prototype);
  }
}

export async function getUserData() {
  const supabase = await createClient();
  const { error, data } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  if (!data.user) {
    return null;
  }

  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, data.user.id),
    columns: { role: true },
  });

  if (!userProfile) {
    return null;
  }

  return {
    id: data.user.id,
    role: userProfile.role,
  };
}

export async function getUserConfigurations() {
  const user = await getUserData();

  if (!user) {
    return null;
  }

  const response = await db.query.configurations.findMany({
    where:
      user.role === "EXTERNAL"
        ? eq(configurations.user_id, user.id)
        : undefined,
    columns: {
      id: true,
      status: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
    },
    with: {
      user: {
        columns: {
          id: true,
          email: true,
          initials: true,
        },
      },
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
  newConfiguration: Omit<NewConfiguration, "user_id">,
  newWaterTanks: Omit<NewWaterTank, "configuration_id">[],
  newWashBays: Omit<NewWashBay, "configuration_id">[]
) => {
  const user = await getUserData();

  if (!user) {
    throw new QueryError("Utente non trovato.", 401);
  }

  const response = await db.transaction(async (tx) => {
    const [createdConfiguration] = await tx
      .insert(configurations)
      .values({ ...newConfiguration, user_id: user.id })
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

  return response;
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
  const user = await getUserData();

  if (!user) {
    throw new QueryError("Utente non trovato.", 401);
  }

  const response = await db.transaction(async (tx) => {
    const {
      id,
      ...configurationDataWithoutId
    }: { id: number } & Omit<Configuration, "id"> = configurationData;

    const condition =
      user.role !== "ADMIN"
        ? and(eq(configurations.id, id), eq(configurations.user_id, user.id))
        : eq(configurations.id, id);

    const [updatedConfiguration] = await tx
      .update(configurations)
      .set(configurationDataWithoutId)
      .where(condition)
      .returning({ id: configurations.id });

    if (!updatedConfiguration) {
      throw new QueryError(
        "Configurazione non trovata. Impossibile aggiornare.",
        403
      );
    }

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

  return response;
};

export async function getBOM(id: number) {
  const configuration = await getOneConfiguration(id);
  if (configuration) {
    const bom = await BOM.init(configuration);
    return bom;
  }
}
