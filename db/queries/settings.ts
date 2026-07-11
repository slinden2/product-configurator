import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  type InstallationItemSetting,
  installationItemSettings,
  type SurchargeSetting,
  surchargeSettings,
} from "@/db/schemas";
import { MSG } from "@/lib/messages";
import type { InstallationItemKind, SurchargeKind } from "@/types";
import { insertActivityLog } from "./activity";
import { type DatabaseType, QueryError, type TransactionType } from "./errors";

export async function getSurchargeSettings(
  txOrDb: DatabaseType | TransactionType = db,
): Promise<SurchargeSetting[]> {
  return txOrDb.query.surchargeSettings.findMany({
    orderBy: asc(surchargeSettings.kind),
  });
}

export async function getSurchargeSettingByKind(
  kind: SurchargeKind,
): Promise<SurchargeSetting> {
  const row = await db.query.surchargeSettings.findFirst({
    where: eq(surchargeSettings.kind, kind),
  });
  if (!row) {
    throw new QueryError(MSG.surcharge.notFound);
  }
  return row;
}

/**
 * Updates a surcharge price and writes the audit log in a single transaction.
 * Both writes succeed or both roll back — the audit entry cannot be silently
 * skipped even if the activity_action enum is stale on the DB side.
 */
export async function updateSurchargeSettingWithAudit(data: {
  kind: SurchargeKind;
  price: string;
  updated_by: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ price: surchargeSettings.price })
      .from(surchargeSettings)
      .where(eq(surchargeSettings.kind, data.kind));

    if (!existing) throw new QueryError(MSG.surcharge.notFound);

    const [row] = await tx
      .update(surchargeSettings)
      .set({ price: data.price, updated_by: data.updated_by })
      .where(eq(surchargeSettings.kind, data.kind))
      .returning({ kind: surchargeSettings.kind });

    if (!row) throw new QueryError(MSG.surcharge.notFound);

    await insertActivityLog(
      {
        userId: data.updated_by,
        action: "SURCHARGE_UPDATE",
        targetEntity: "surcharge_setting",
        targetId: data.kind,
        metadata: { old_value: existing.price, new_value: data.price },
      },
      tx,
    );
  });
}

export async function getInstallationItemSettings(): Promise<
  InstallationItemSetting[]
> {
  return db.query.installationItemSettings.findMany({
    orderBy: asc(installationItemSettings.kind),
  });
}

/**
 * Updates an installation item default price and writes the audit log in a
 * single transaction, mirroring updateSurchargeSettingWithAudit.
 */
export async function updateInstallationItemSettingWithAudit(data: {
  kind: InstallationItemKind;
  price: string;
  updated_by: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ price: installationItemSettings.price })
      .from(installationItemSettings)
      .where(eq(installationItemSettings.kind, data.kind));

    if (!existing) throw new QueryError(MSG.installation.notFound);

    const [row] = await tx
      .update(installationItemSettings)
      .set({ price: data.price, updated_by: data.updated_by })
      .where(eq(installationItemSettings.kind, data.kind))
      .returning({ kind: installationItemSettings.kind });

    if (!row) throw new QueryError(MSG.installation.notFound);

    await insertActivityLog(
      {
        userId: data.updated_by,
        action: "INSTALLATION_ITEM_UPDATE",
        targetEntity: "installation_item_setting",
        targetId: data.kind,
        metadata: { old_value: existing.price, new_value: data.price },
      },
      tx,
    );
  });
}
