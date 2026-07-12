import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { partNumbers, priceCoefficients, userProfiles } from "@/db/schemas";
import { MSG } from "@/lib/messages";
import type { CoefficientSource } from "@/types";
import { insertActivityLog } from "./activity";
import { type DatabaseType, QueryError, type TransactionType } from "./errors";

// ── Price coefficients ──────────────────────────────────────────────────────

export type PriceCoefficientWithUpdater = {
  id: number;
  pn: string;
  description: string | null;
  cost: string | null;
  coefficient: string;
  source: CoefficientSource;
  is_custom: boolean;
  updated_by: string | null;
  updaterEmail: string | null;
  updaterInitials: string | null;
  created_at: Date;
  updated_at: Date;
};

export async function getAllPriceCoefficients(): Promise<
  PriceCoefficientWithUpdater[]
> {
  return db
    .select({
      id: priceCoefficients.id,
      pn: priceCoefficients.pn,
      description: partNumbers.description,
      cost: partNumbers.cost,
      coefficient: priceCoefficients.coefficient,
      source: priceCoefficients.source,
      is_custom: priceCoefficients.is_custom,
      updated_by: priceCoefficients.updated_by,
      updaterEmail: userProfiles.email,
      updaterInitials: userProfiles.initials,
      created_at: priceCoefficients.created_at,
      updated_at: priceCoefficients.updated_at,
    })
    .from(priceCoefficients)
    .leftJoin(partNumbers, eq(priceCoefficients.pn, partNumbers.pn))
    .leftJoin(userProfiles, eq(priceCoefficients.updated_by, userProfiles.id))
    .orderBy(asc(priceCoefficients.pn));
}

export async function getPriceCoefficientsByArray(
  pns: string[],
): Promise<{ pn: string; coefficient: string }[]> {
  if (pns.length === 0) return [];
  return db
    .select({
      pn: priceCoefficients.pn,
      coefficient: priceCoefficients.coefficient,
    })
    .from(priceCoefficients)
    .where(inArray(priceCoefficients.pn, pns));
}

export async function getFullPriceCoefficientByPn(pn: string): Promise<
  | {
      pn: string;
      coefficient: string;
      source: CoefficientSource;
      is_custom: boolean;
    }
  | undefined
> {
  const [row] = await db
    .select({
      pn: priceCoefficients.pn,
      coefficient: priceCoefficients.coefficient,
      source: priceCoefficients.source,
      is_custom: priceCoefficients.is_custom,
    })
    .from(priceCoefficients)
    .where(eq(priceCoefficients.pn, pn));
  return row;
}

export async function insertMissingMaxBomCoefficients(
  pns: string[],
  defaultCoefficient: string,
  txOrDb: DatabaseType | TransactionType = db,
): Promise<number> {
  if (pns.length === 0) return 0;
  const rows = await txOrDb
    .insert(priceCoefficients)
    .values(
      pns.map((pn) => ({
        pn,
        coefficient: defaultCoefficient,
        source: "MAXBOM" as const,
        is_custom: false,
      })),
    )
    .onConflictDoNothing({ target: priceCoefficients.pn })
    .returning({ pn: priceCoefficients.pn });
  return rows.length;
}

export async function createPriceCoefficientWithAudit(data: {
  pn: string;
  coefficient: string;
  source: CoefficientSource;
  is_custom: boolean;
  updated_by: string;
}): Promise<{ id: number; pn: string }> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(priceCoefficients)
      .values(data)
      .returning({ id: priceCoefficients.id, pn: priceCoefficients.pn });
    await insertActivityLog(
      {
        userId: data.updated_by,
        action: "COEFFICIENT_CREATE",
        targetEntity: "price_coefficient",
        targetId: data.pn,
        metadata: { old_value: null, new_value: data.coefficient },
      },
      tx,
    );
    return row;
  });
}

export async function updatePriceCoefficientByPnWithAudit(data: {
  pn: string;
  coefficient: string;
  updated_by: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ coefficient: priceCoefficients.coefficient })
      .from(priceCoefficients)
      .where(eq(priceCoefficients.pn, data.pn));

    if (!existing) throw new QueryError(MSG.coefficient.notFound);

    await tx
      .update(priceCoefficients)
      .set({
        coefficient: data.coefficient,
        is_custom: true,
        updated_by: data.updated_by,
        updated_at: new Date(),
      })
      .where(eq(priceCoefficients.pn, data.pn));

    await insertActivityLog(
      {
        userId: data.updated_by,
        action: "COEFFICIENT_UPDATE",
        targetEntity: "price_coefficient",
        targetId: data.pn,
        metadata: {
          old_value: existing.coefficient,
          new_value: data.coefficient,
        },
      },
      tx,
    );
  });
}

export async function deletePriceCoefficientByPnWithAudit(data: {
  pn: string;
  updated_by: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ coefficient: priceCoefficients.coefficient })
      .from(priceCoefficients)
      .where(eq(priceCoefficients.pn, data.pn));

    if (!existing) throw new QueryError(MSG.coefficient.notFound);

    await tx.delete(priceCoefficients).where(eq(priceCoefficients.pn, data.pn));

    await insertActivityLog(
      {
        userId: data.updated_by,
        action: "COEFFICIENT_DELETE",
        targetEntity: "price_coefficient",
        targetId: data.pn,
        metadata: { old_value: existing.coefficient },
      },
      tx,
    );
  });
}

export async function resetPriceCoefficientWithAudit(data: {
  pn: string;
  defaultCoefficient: string;
  updated_by: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ coefficient: priceCoefficients.coefficient })
      .from(priceCoefficients)
      .where(eq(priceCoefficients.pn, data.pn));

    if (!existing) throw new QueryError(MSG.coefficient.notFound);

    await tx
      .update(priceCoefficients)
      .set({
        coefficient: data.defaultCoefficient,
        is_custom: false,
        updated_by: data.updated_by,
        updated_at: new Date(),
      })
      .where(eq(priceCoefficients.pn, data.pn));

    await insertActivityLog(
      {
        userId: data.updated_by,
        action: "COEFFICIENT_RESET",
        targetEntity: "price_coefficient",
        targetId: data.pn,
        metadata: {
          old_value: existing.coefficient,
          new_value: data.defaultCoefficient,
        },
      },
      tx,
    );
  });
}
