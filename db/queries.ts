import { db } from "@/db";
import { configurations, userProfiles, waterTanks } from "@/db/schemas";
import { BOM } from "@/lib/BOM";
import { and, desc, eq, inArray, is, sql, SQL } from "drizzle-orm";
import { PgBoolean, PgEnumColumn, PgInteger } from "drizzle-orm/pg-core";
import { createClient } from "@/utils/supabase/server";
import {
  UpdateConfigSchema,
  type ConfigSchema,
} from "@/validation/config-schema";
import { WaterTankSchema } from "@/validation/water-tank-schema";
import {
  transformConfigToDbInsert,
  transformConfigToDbUpdate,
  transformWaterTankSchemaToDbData,
} from "./transformations";

export type DatabaseType = typeof db;
export type TransactionType = Parameters<
  Parameters<DatabaseType["transaction"]>[0]
>[0];

export type AllConfigurations = Awaited<
  ReturnType<typeof getUserConfigurations>
>;

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

export async function getConfigurationWithTanksAndBays(id: number) {
  const response = await db.query.configurations.findFirst({
    where: eq(configurations.id, id),
    with: {
      water_tanks: true,
      wash_bays: true,
    },
  });
  return response;
}

export async function getConfiguration(id: number) {
  const response = await db.query.configurations.findFirst({
    where: eq(configurations.id, id),
  });
  return response;
}

export const insertConfiguration = async (newConfiguration: ConfigSchema) => {
  const user = await getUserData();

  if (!user) {
    throw new QueryError("Utente non trovato.", 401);
  }

  const dbData = transformConfigToDbInsert(newConfiguration, user.id);

  const [insertedConfiguration] = await db
    .insert(configurations)
    .values(dbData)
    .returning({ id: configurations.id });

  if (!insertedConfiguration) {
    throw new QueryError("Impossibile creare la configurazione.", 500);
  }

  return insertedConfiguration;
};

export const insertWaterTank = async (
  confId: number,
  newWaterTank: WaterTankSchema
) => {
  const user = await getUserData();

  if (!user) {
    throw new QueryError("Utente non trovato.", 401);
  }

  const configuration = await getConfiguration(confId);

  if (!configuration) {
    throw new QueryError("Configurazione non trovata.", 404);
  }

  if (user.id !== configuration.user_id && user.role !== "ADMIN") {
    throw new QueryError("Utente non autorizzato.", 403);
  }

  const dbData = transformWaterTankSchemaToDbData(newWaterTank);

  const [id] = await db
    .insert(waterTanks)
    .values({ ...dbData, configuration_id: confId })
    .returning({ id: waterTanks.id });

  return { success: true, id };
};

export const updateWaterTank = async (
  confId: number,
  waterTankId: number,
  waterTank: WaterTankSchema
) => {
  const user = await getUserData();

  if (!user) {
    throw new QueryError("Utente non trovato.", 401);
  }

  const configuration = await getConfiguration(confId);

  if (!configuration) {
    throw new QueryError("Configurazione non trovata.", 404);
  }

  if (user.id !== configuration.user_id && user.role !== "ADMIN") {
    throw new QueryError("Utente non autorizzato.", 403);
  }

  const dbData = transformWaterTankSchemaToDbData(waterTank);

  const [id] = await db
    .update(waterTanks)
    .set(dbData)
    .where(eq(waterTanks.id, waterTankId))
    .returning({ id: waterTanks.id });

  return { success: true, id };
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
  confId: number,
  configurationData: UpdateConfigSchema
): Promise<{ id: number }> => {
  const user = await getUserData();

  if (!user) {
    throw new QueryError("Utente non trovato.", 401);
  }

  const setData = transformConfigToDbUpdate(configurationData);
  console.log("setData :>> ", setData); // DEBUG

  const response = await db.transaction(async (tx) => {
    const condition =
      user.role !== "ADMIN"
        ? and(
            eq(configurations.id, confId),
            eq(configurations.user_id, user.id)
          )
        : eq(configurations.id, confId);

    const [updatedConfiguration] = await tx
      .update(configurations)
      .set(setData)
      .where(condition)
      .returning({ id: configurations.id });

    if (!updatedConfiguration) {
      throw new QueryError(
        "Configurazione non trovata o non autorizzata per l'aggiornamento.",
        404
      );
    }

    return updatedConfiguration;
  });

  return response;
};

export async function getBOM(id: number) {
  const configuration = await getConfigurationWithTanksAndBays(id);
  if (configuration) {
    const bom = await BOM.init(configuration);
    return bom;
  }
}
