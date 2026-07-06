"use server";

import { getAssemblyChildren, getUserData } from "@/db/queries";
import type { BOMItemWithCost } from "@/lib/BOM";
import { explodeBomsToLeaves } from "@/lib/BOM/explode-bom";
import { MSG } from "@/lib/messages";
import { mapActionError } from "./lib/map-action-error";

type BOMData = {
  generalBOM: BOMItemWithCost[];
  waterTankBOMs: BOMItemWithCost[][];
  washBayBOMs: BOMItemWithCost[][];
};

export async function explodeBomToLeavesAction(data: BOMData) {
  const user = await getUserData();
  if (!user) {
    return { success: false as const, error: MSG.auth.userNotAuthenticated };
  }

  try {
    const exploded = await explodeBomsToLeaves(data);
    return { success: true as const, data: exploded };
  } catch (err) {
    return mapActionError(err, "Failed to explode BOM to leaves:");
  }
}

export async function getAssemblyChildrenAction(parentPn: string) {
  const user = await getUserData();
  if (!user) {
    return { success: false as const, error: MSG.auth.userNotAuthenticated };
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
