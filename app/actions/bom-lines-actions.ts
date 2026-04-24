"use server";

import { DatabaseError } from "pg";
import { getAssemblyChildren, getUserData, QueryError } from "@/db/queries";
import type { BOMItemWithCost } from "@/lib/BOM";
import { explodeBomsToLeaves } from "@/lib/BOM/explode-bom";
import { MSG } from "@/lib/messages";

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
    console.error("Failed to explode BOM to leaves:", err);
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      return { success: false as const, error: MSG.db.error };
    }
    return { success: false as const, error: MSG.db.unknown };
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
    console.error("Failed to fetch assembly children:", err);
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      return { success: false as const, error: MSG.db.error };
    }
    return { success: false as const, error: MSG.db.unknown };
  }
}
