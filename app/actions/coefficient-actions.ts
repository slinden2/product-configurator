"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  createPriceCoefficientWithAudit,
  deletePriceCoefficientByPnWithAudit,
  getFullPriceCoefficientByPn,
  getPriceCoefficientsByArray,
  insertActivityLog,
  insertMissingMaxBomCoefficients,
  resetPriceCoefficientWithAudit,
  updatePriceCoefficientByPnWithAudit,
} from "@/db/queries";
import { MSG } from "@/lib/messages";
import { collectMaxBomPns, DEFAULT_COEFFICIENT } from "@/lib/pricing";
import {
  coefficientSchema,
  coefficientUpdateSchema,
} from "@/validation/coefficient-schema";
import { authorizeAdmin } from "./lib/authorize";
import { mapActionError } from "./lib/map-action-error";

const REVALIDATE_PATH = "/gestione/coefficienti";

const DEFAULT_COEFFICIENT_DB = DEFAULT_COEFFICIENT.toFixed(2);

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

  const auth = await authorizeAdmin(MSG.coefficient.adminOnly);
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

    await createPriceCoefficientWithAudit({
      pn,
      coefficient,
      source,
      is_custom: true,
      updated_by: auth.user.id,
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true as const };
  } catch (err) {
    return mapActionError(err, "Failed to create coefficient:");
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

  const auth = await authorizeAdmin(MSG.coefficient.adminOnly);
  if (!auth.success) return { success: false as const, error: auth.error };

  const { pn, coefficient } = parsed.data;

  try {
    const existing = await getFullPriceCoefficientByPn(pn);
    if (!existing)
      return { success: false as const, error: MSG.coefficient.notFound };

    await updatePriceCoefficientByPnWithAudit({
      pn,
      coefficient,
      updated_by: auth.user.id,
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true as const };
  } catch (err) {
    return mapActionError(err, "Failed to update coefficient:");
  }
}

export async function deleteCoefficientAction(pn: string) {
  const auth = await authorizeAdmin(MSG.coefficient.adminOnly);
  if (!auth.success) return { success: false as const, error: auth.error };

  try {
    const existing = await getFullPriceCoefficientByPn(pn);
    if (!existing)
      return { success: false as const, error: MSG.coefficient.notFound };

    if (existing.source === "MAXBOM") {
      const activeMaxBomPns = collectMaxBomPns();
      if (activeMaxBomPns.includes(pn))
        return {
          success: false as const,
          error: MSG.coefficient.cannotDeleteMaxbom,
        };
    }

    await deletePriceCoefficientByPnWithAudit({
      pn,
      updated_by: auth.user.id,
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true as const };
  } catch (err) {
    return mapActionError(err, "Failed to delete coefficient:");
  }
}

export async function resetCoefficientAction(pn: string) {
  const auth = await authorizeAdmin(MSG.coefficient.adminOnly);
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

    await resetPriceCoefficientWithAudit({
      pn,
      defaultCoefficient: DEFAULT_COEFFICIENT_DB,
      updated_by: auth.user.id,
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true as const };
  } catch (err) {
    return mapActionError(err, "Failed to reset coefficient:");
  }
}

export async function syncMaxBomCoefficientsAction() {
  const auth = await authorizeAdmin(MSG.coefficient.adminOnly);
  if (!auth.success) return { success: false as const, error: auth.error };

  try {
    const maxBomPns = collectMaxBomPns();
    const existing = await getPriceCoefficientsByArray(maxBomPns);
    const existingSet = new Set(existing.map((r) => r.pn));
    const missing = maxBomPns.filter((pn) => !existingSet.has(pn));

    let inserted = 0;
    await db.transaction(async (tx) => {
      inserted = await insertMissingMaxBomCoefficients(
        missing,
        DEFAULT_COEFFICIENT_DB,
        tx,
      );
      if (inserted > 0) {
        await insertActivityLog(
          {
            userId: auth.user.id,
            action: "COEFFICIENT_SYNC",
            targetEntity: "price_coefficient",
            targetId: "MAXBOM",
            metadata: { inserted, pns: missing.slice(0, 20) },
          },
          tx,
        );
      }
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true as const, data: { inserted } };
  } catch (err) {
    return mapActionError(err, "Failed to sync MAXBOM coefficients:");
  }
}
