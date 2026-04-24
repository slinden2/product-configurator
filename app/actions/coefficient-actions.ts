"use server";

import { revalidatePath } from "next/cache";
import { DatabaseError } from "pg";
import {
  createPriceCoefficient,
  deletePriceCoefficientByPn,
  getFullPriceCoefficientByPn,
  getPriceCoefficientsByArray,
  getUserData,
  insertMissingMaxBomCoefficients,
  logActivity,
  QueryError,
  updatePriceCoefficientByPn,
} from "@/db/queries";
import { MSG } from "@/lib/messages";
import { collectMaxBomPns, DEFAULT_COEFFICIENT } from "@/lib/pricing";
import {
  coefficientSchema,
  coefficientUpdateSchema,
} from "@/validation/coefficient-schema";

const REVALIDATE_PATH = "/gestione/coefficienti";

const DEFAULT_COEFFICIENT_DB = DEFAULT_COEFFICIENT.toFixed(2);

async function authorizeAdmin() {
  const user = await getUserData();
  if (!user)
    return { success: false as const, error: MSG.auth.userNotAuthenticated };
  if (user.role !== "ADMIN")
    return { success: false as const, error: MSG.coefficient.adminOnly };
  return { success: true as const, user };
}

export async function createCoefficientAction(formData: {
  pn: string;
  coefficient: number | string;
  source: "MAXBOM" | "MANUAL";
}) {
  const parsed = coefficientSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false as const,
      error: MSG.coefficient.invalidCoefficient,
    };
  }

  const auth = await authorizeAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };

  const { pn, coefficient, source } = parsed.data;

  try {
    const existing = await getFullPriceCoefficientByPn(pn);
    if (existing) {
      return {
        success: false as const,
        error: MSG.coefficient.pnAlreadyExists,
      };
    }

    await createPriceCoefficient({
      pn,
      coefficient,
      source,
      is_custom: true,
      updated_by: auth.user.id,
    });

    await logActivity({
      userId: auth.user.id,
      action: "COEFFICIENT_CREATE",
      targetEntity: "price_coefficient",
      targetId: pn,
      metadata: { old_value: null, new_value: coefficient },
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true as const };
  } catch (err) {
    if (err instanceof QueryError)
      return { success: false as const, error: err.message };
    if (err instanceof DatabaseError)
      return { success: false as const, error: MSG.db.error };
    return { success: false as const, error: MSG.db.unknown };
  }
}

export async function updateCoefficientAction(formData: {
  pn: string;
  coefficient: number | string;
}) {
  const parsed = coefficientUpdateSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false as const,
      error: MSG.coefficient.invalidCoefficient,
    };
  }

  const auth = await authorizeAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };

  const { pn, coefficient } = parsed.data;

  try {
    const existing = await getFullPriceCoefficientByPn(pn);
    if (!existing)
      return { success: false as const, error: MSG.coefficient.notFound };

    await updatePriceCoefficientByPn({
      pn,
      coefficient,
      is_custom: true,
      updated_by: auth.user.id,
    });

    await logActivity({
      userId: auth.user.id,
      action: "COEFFICIENT_UPDATE",
      targetEntity: "price_coefficient",
      targetId: pn,
      metadata: { old_value: existing.coefficient, new_value: coefficient },
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true as const };
  } catch (err) {
    if (err instanceof QueryError)
      return { success: false as const, error: err.message };
    if (err instanceof DatabaseError)
      return { success: false as const, error: MSG.db.error };
    return { success: false as const, error: MSG.db.unknown };
  }
}

export async function deleteCoefficientAction(pn: string) {
  const auth = await authorizeAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };

  try {
    const existing = await getFullPriceCoefficientByPn(pn);
    if (!existing)
      return { success: false as const, error: MSG.coefficient.notFound };

    if (existing.source === "MAXBOM")
      return {
        success: false as const,
        error: MSG.coefficient.cannotDeleteMaxbom,
      };

    const deleted = await deletePriceCoefficientByPn(pn);
    if (!deleted)
      return { success: false as const, error: MSG.coefficient.notFound };

    await logActivity({
      userId: auth.user.id,
      action: "COEFFICIENT_DELETE",
      targetEntity: "price_coefficient",
      targetId: pn,
      metadata: { old_value: existing.coefficient },
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true as const };
  } catch (err) {
    if (err instanceof QueryError)
      return { success: false as const, error: err.message };
    if (err instanceof DatabaseError)
      return { success: false as const, error: MSG.db.error };
    return { success: false as const, error: MSG.db.unknown };
  }
}

export async function resetCoefficientAction(pn: string) {
  const auth = await authorizeAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };

  try {
    const existing = await getFullPriceCoefficientByPn(pn);
    if (!existing)
      return { success: false as const, error: MSG.coefficient.notFound };

    if (existing.source === "MANUAL")
      return {
        success: false as const,
        error: MSG.coefficient.cannotResetManual,
      };

    const oldValue = existing.coefficient;

    await updatePriceCoefficientByPn({
      pn,
      coefficient: DEFAULT_COEFFICIENT_DB,
      is_custom: false,
      updated_by: auth.user.id,
    });

    await logActivity({
      userId: auth.user.id,
      action: "COEFFICIENT_RESET",
      targetEntity: "price_coefficient",
      targetId: pn,
      metadata: { old_value: oldValue, new_value: DEFAULT_COEFFICIENT_DB },
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true as const };
  } catch (err) {
    if (err instanceof QueryError)
      return { success: false as const, error: err.message };
    if (err instanceof DatabaseError)
      return { success: false as const, error: MSG.db.error };
    return { success: false as const, error: MSG.db.unknown };
  }
}

export async function syncMaxBomCoefficientsAction() {
  const auth = await authorizeAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };

  try {
    const maxBomPns = collectMaxBomPns();
    const existing = await getPriceCoefficientsByArray(maxBomPns);
    const existingSet = new Set(existing.map((r) => r.pn));
    const missing = maxBomPns.filter((pn) => !existingSet.has(pn));

    const inserted = await insertMissingMaxBomCoefficients(
      missing,
      DEFAULT_COEFFICIENT_DB,
    );

    if (inserted > 0) {
      await logActivity({
        userId: auth.user.id,
        action: "COEFFICIENT_SYNC",
        targetEntity: "price_coefficient",
        targetId: "MAXBOM",
        metadata: { inserted, pns: missing.slice(0, 20) },
      });
    }

    revalidatePath(REVALIDATE_PATH);
    return { success: true as const, data: { inserted } };
  } catch (err) {
    if (err instanceof QueryError)
      return { success: false as const, error: err.message };
    if (err instanceof DatabaseError)
      return { success: false as const, error: MSG.db.error };
    return { success: false as const, error: MSG.db.unknown };
  }
}
