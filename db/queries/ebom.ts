import { and, asc, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import {
  bomLines,
  engineeringBomItems,
  type NewEngineeringBomItem,
  partNumbers,
} from "@/db/schemas";
import type { DatabaseType, TransactionType } from "./errors";

export async function getPartNumbersByArray(array: string[]) {
  const response = await db.query.partNumbers.findMany({
    where: inArray(partNumbers.pn, array),
  });
  return response;
}

export async function searchPartNumbers(query: string, limit = 20) {
  const pattern = query.includes("%") ? query : `%${query}%`;
  return db.query.partNumbers.findMany({
    // Inactive pns (deleted in the ERP) are excluded from the picker only;
    // other reads keep returning them so existing BOMs stay computable.
    where: and(
      eq(partNumbers.is_active, true),
      or(
        ilike(partNumbers.pn, pattern),
        ilike(partNumbers.description, pattern),
      ),
    ),
    limit,
    orderBy: [asc(partNumbers.pn)],
  });
}

// --- Engineering BOM ---

export async function getEngineeringBomItems(configId: number) {
  return db
    .select({
      id: engineeringBomItems.id,
      configuration_id: engineeringBomItems.configuration_id,
      category: engineeringBomItems.category,
      category_index: engineeringBomItems.category_index,
      pn: engineeringBomItems.pn,
      is_custom: engineeringBomItems.is_custom,
      description: engineeringBomItems.description,
      qty: engineeringBomItems.qty,
      original_qty: engineeringBomItems.original_qty,
      is_deleted: engineeringBomItems.is_deleted,
      is_added: engineeringBomItems.is_added,
      sort_order: engineeringBomItems.sort_order,
      tag: engineeringBomItems.tag,
      bom_rules_version: engineeringBomItems.bom_rules_version,
      created_at: engineeringBomItems.created_at,
      updated_at: engineeringBomItems.updated_at,
      pn_type: partNumbers.pn_type,
      is_phantom: partNumbers.is_phantom,
    })
    .from(engineeringBomItems)
    .leftJoin(partNumbers, eq(engineeringBomItems.pn, partNumbers.pn))
    .where(eq(engineeringBomItems.configuration_id, configId))
    .orderBy(
      asc(engineeringBomItems.category),
      asc(engineeringBomItems.category_index),
      asc(engineeringBomItems.sort_order),
    );
}

export type EngineeringBomItemWithPart = Awaited<
  ReturnType<typeof getEngineeringBomItems>
>[number];

/**
 * Batch variant of `getEngineeringBomItems` for margin math across many configs
 * (one query instead of one per line). Lean select — only the fields cost
 * computation needs — with no ordering, since the rows are aggregated, not
 * displayed. Configs without an EBOM simply contribute no rows.
 */
export async function getEngineeringBomItemsForConfigs(configIds: number[]) {
  if (configIds.length === 0) return [];
  return db
    .select({
      configuration_id: engineeringBomItems.configuration_id,
      pn: engineeringBomItems.pn,
      description: engineeringBomItems.description,
      qty: engineeringBomItems.qty,
      tag: engineeringBomItems.tag,
      is_deleted: engineeringBomItems.is_deleted,
    })
    .from(engineeringBomItems)
    .where(inArray(engineeringBomItems.configuration_id, configIds));
}

/**
 * Batch variant of `getAssemblyChildren` for level-by-level BOM explosion
 * (one query per tree level instead of one per assembly). Rows with a
 * dangling child pn are skipped; parents with no rows are absent from the map.
 */
export async function getAssemblyChildrenForParents(parentPns: string[]) {
  const byParent = new Map<string, AssemblyChild[]>();
  if (parentPns.length === 0) return byParent;

  const rows = await db.query.bomLines.findMany({
    where: inArray(bomLines.parent_pn, parentPns),
    orderBy: [asc(bomLines.parent_pn), asc(bomLines.sort_order)],
    with: {
      child: {
        columns: {
          pn: true,
          description: true,
          pn_type: true,
          is_phantom: true,
          is_subcontract: true,
        },
      },
    },
  });

  for (const r of rows) {
    if (!r.child) continue;
    const children = byParent.get(r.parent_pn) ?? [];
    children.push({
      pn: r.child.pn,
      description: r.child.description,
      qty: Number(r.qty),
      sort_order: r.sort_order,
      pn_type: r.child.pn_type,
      is_phantom: r.child.is_phantom,
      is_subcontract: r.child.is_subcontract,
    });
    byParent.set(r.parent_pn, children);
  }
  return byParent;
}

export type AssemblyChild = Pick<
  typeof partNumbers.$inferSelect,
  "pn" | "description" | "pn_type" | "is_phantom" | "is_subcontract"
> & {
  qty: number;
  sort_order: (typeof bomLines.$inferSelect)["sort_order"];
};

export async function getAssemblyChildren(parentPn: string) {
  const byParent = await getAssemblyChildrenForParents([parentPn]);
  return byParent.get(parentPn) ?? [];
}

export async function hasEngineeringBom(
  configId: number,
  txOrDb: DatabaseType | TransactionType = db,
) {
  const row = await txOrDb.query.engineeringBomItems.findFirst({
    where: eq(engineeringBomItems.configuration_id, configId),
    columns: { id: true },
  });
  return row !== undefined;
}

export async function insertEngineeringBomItems(
  items: NewEngineeringBomItem[],
  txOrDb: DatabaseType | TransactionType = db,
) {
  if (items.length === 0) return;
  await txOrDb.insert(engineeringBomItems).values(items);
}

/**
 * Hard-deletes all engineering BOM items for a configuration.
 * Used during BOM regeneration (full wipe + reinsert).
 *
 * Individual item removal uses soft delete (is_deleted toggle) so the UI
 * can display removed items with visual distinction and allow restoration.
 */
export async function deleteAllEngineeringBomItems(
  configId: number,
  txOrDb: DatabaseType | TransactionType = db,
) {
  await txOrDb
    .delete(engineeringBomItems)
    .where(eq(engineeringBomItems.configuration_id, configId));
}
