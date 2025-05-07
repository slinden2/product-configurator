import { db } from "@/db";
import {
  configurations,
  userProfiles,
  washBays,
  waterTanks,
} from "@/db/schemas";
import { BOM } from "@/lib/BOM";
import { and, asc, desc, eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import {
  UpdateConfigSchema,
  type ConfigSchema,
} from "@/validation/config-schema";
import { WaterTankSchema } from "@/validation/water-tank-schema";
import {
  transformConfigToDbInsert,
  transformConfigToDbUpdate,
  transformWashBaySchemaToDbData,
  transformWaterTankSchemaToDbData,
} from "./transformations";
import { WashBaySchema } from "@/validation/wash-bay-schema";
import { ConfigStatusSchema } from "@/validation/config-status.schema";

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
      water_tanks: {
        orderBy: [asc(waterTanks.id)],
      },
      wash_bays: {
        orderBy: [asc(washBays.id)],
      },
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

export const updateConfigStatus = async (
  confId: number,
  user: NonNullable<UserData>,
  statusData: ConfigStatusSchema
) => {
  const configuration = await getConfiguration(confId);

  if (!configuration) {
    throw new QueryError("Configurazione non trovata.", 404);
  }

  if (configuration.status === statusData.status) {
    throw new QueryError("Stato già aggiornato.", 400);
  }

  // TODO Need extentive rules for different status changes/validations

  if (user.id !== configuration.user_id && user.role !== "ADMIN") {
    throw new QueryError("Utente non autorizzato.", 403);
  }

  const condition =
    user.role !== "ADMIN"
      ? and(eq(configurations.id, confId), eq(configurations.user_id, user.id))
      : eq(configurations.id, confId);

  const [response] = await db
    .update(configurations)
    .set({ status: statusData.status })
    .where(condition)
    .returning({ id: configurations.id });

  if (!response) {
    throw new QueryError(
      "Configurazione non trovata o non autorizzata per l'aggiornamento.",
      404
    );
  }

  return response;
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

export const deleteWaterTank = async (confId: number, waterTankId: number) => {
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

  const [id] = await db
    .delete(waterTanks)
    .where(
      and(
        eq(waterTanks.id, waterTankId),
        eq(waterTanks.configuration_id, confId)
      )
    )
    .returning({ id: waterTanks.id });

  return { success: true, id };
};

export const insertWashBay = async (
  confId: number,
  newWashBay: WashBaySchema
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

  const dbData = transformWashBaySchemaToDbData(newWashBay);

  const [id] = await db
    .insert(washBays)
    .values({ ...dbData, configuration_id: confId })
    .returning({ id: washBays.id });

  return { success: true, id };
};

export const updateWashBay = async (
  confId: number,
  washBayId: number,
  washBay: WashBaySchema
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

  const dbData = transformWashBaySchemaToDbData(washBay);

  const [id] = await db
    .update(washBays)
    .set(dbData)
    .where(eq(washBays.id, washBayId))
    .returning({ id: washBays.id });

  return { success: true, id };
};

export const deleteWashBay = async (confId: number, washBayId: number) => {
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

  const [id] = await db
    .delete(washBays)
    .where(
      and(eq(washBays.id, washBayId), eq(washBays.configuration_id, confId))
    )
    .returning({ id: washBays.id });

  return {
    success: true,
    id,
  };
};

export async function getBOM(id: number) {
  const configuration = await getConfigurationWithTanksAndBays(id);
  if (configuration) {
    const bom = await BOM.init(configuration);
    return bom;
  }
}
