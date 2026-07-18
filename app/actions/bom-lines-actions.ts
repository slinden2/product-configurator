"use server";

import { buildBomCostExportData } from "@/app/configurazioni/bom/[id]/bom-helpers";
import { getAssemblyChildren, getBOM, getUserData } from "@/db/queries";
import { canViewBom } from "@/lib/access";
import { explodeBomsToLeaves } from "@/lib/BOM/explode-bom";
import { MSG } from "@/lib/messages";
import { mapActionError } from "./lib/map-action-error";

/**
 * Builds the enriched cost-export payload for a configuration's BOM on demand —
 * only when the user clicks "Esporta costi" — so ordinary BOM page views run zero
 * cost lookups. Everything is derived server-side from `confId` (no client-supplied
 * BOM input): a scoped `getBOM` (auth + ownership), the same EBOM-vs-generated cost
 * basis the page uses, then the leaf explosion. Returns the cost BOMs plus the
 * exploded leaves, ready for `createExcelFile`.
 */
export async function buildBomCostExportAction(confId: number) {
  const user = await getUserData();
  if (!user) {
    return { success: false as const, error: MSG.auth.userNotAuthenticated };
  }

  if (!canViewBom(user.role)) {
    return { success: false as const, error: MSG.bom.unauthorized };
  }

  try {
    const bom = await getBOM(confId, user);
    if (!bom) {
      return { success: false as const, error: MSG.config.notFound };
    }

    const costData = await buildBomCostExportData(bom, confId);
    const exploded = await explodeBomsToLeaves(costData);

    return { success: true as const, data: { ...costData, exploded } };
  } catch (err) {
    return mapActionError(err, "Failed to build BOM cost export:");
  }
}

export async function getAssemblyChildrenAction(parentPn: string) {
  const user = await getUserData();
  if (!user) {
    return { success: false as const, error: MSG.auth.userNotAuthenticated };
  }

  if (!canViewBom(user.role)) {
    return { success: false as const, error: MSG.bom.unauthorized };
  }

  const pn = parentPn?.trim();
  if (!pn) {
    return { success: true as const, data: [] };
  }

  try {
    const data = await getAssemblyChildren(pn);
    return { success: true as const, data };
  } catch (err) {
    return mapActionError(err, "Failed to fetch assembly children:");
  }
}
