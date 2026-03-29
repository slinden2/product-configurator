"use server";

import { isEditable } from "@/app/actions/lib/auth-checks";
import { db } from "@/db";
import {
  getConfiguration,
  getConfigurationWithTanksAndBays,
  getUserData,
  hasEngineeringBom,
  getPartNumbersByArray,
  insertEngineeringBomItems,
  QueryError,
  searchPartNumbers,
} from "@/db/queries";
import { engineeringBomItems, NewEngineeringBomItem } from "@/db/schemas";
import { MSG } from "@/lib/messages";
import { DatabaseError } from "pg";
import { BOM } from "@/lib/BOM";
import { BOMItemWithDescription } from "@/lib/BOM";
import { BOM_RULES_VERSION } from "@/lib/BOM/max-bom";
import { engineeringBomItemSchema } from "@/validation/engineering-bom-item-schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function prepareBomItems(configuration: NonNullable<
  Awaited<ReturnType<typeof getConfigurationWithTanksAndBays>>
>) {
  const confId = configuration.id;
  const bom = BOM.init(configuration);
  const { generalBOM, waterTankBOMs, washBayBOMs } = await bom.buildCompleteBOM();
  const tsePns = await getTsePns(generalBOM, waterTankBOMs, washBayBOMs);

  return flattenBomToItems(
    confId,
    generalBOM,
    waterTankBOMs,
    washBayBOMs,
    tsePns
  );
}

async function authorizeEngineeringBomAction(confId: number) {
  const user = await getUserData();
  if (!user) {
    return {
      success: false as const,
      error: MSG.auth.userNotAuthenticated,
    }
  }

  if (user.role === "SALES") {
    return {
      success: false as const,
      error: MSG.bom.unauthorized,
    }
  }

  const configuration = await getConfigurationWithTanksAndBays(confId);
  if (!configuration) {
    return {
      success: false as const,
      error: MSG.config.notFound,
    }
  }

  if (!isEditable(configuration.status, user.role)) {
    return {
      success: false as const,
      error: MSG.bom.unauthorizedState,
    }
  }

  return { user, configuration, success: true as const };
}

async function getTsePns(
  generalBOM: BOMItemWithDescription[],
  waterTankBOMs: BOMItemWithDescription[][],
  washBayBOMs: BOMItemWithDescription[][]
): Promise<Set<string>> {
  const allPns = [
    ...generalBOM.map((i) => i.pn),
    ...waterTankBOMs.flat().map((i) => i.pn),
    ...washBayBOMs.flat().map((i) => i.pn),
  ];
  const uniquePns = [...new Set(allPns)];
  const existing = await getPartNumbersByArray(uniquePns);
  return new Set(existing.map((p) => p.pn));
}

function flattenBomToItems(
  confId: number,
  generalBOM: BOMItemWithDescription[],
  waterTankBOMs: BOMItemWithDescription[][],
  washBayBOMs: BOMItemWithDescription[][],
  tsePns: Set<string>
): NewEngineeringBomItem[] {
  const items: NewEngineeringBomItem[] = [];

  const toRow = (
    item: BOMItemWithDescription,
    category: "GENERAL" | "WATER_TANK" | "WASH_BAY",
    categoryIndex: number,
    sortOrder: number
  ): NewEngineeringBomItem => ({
    configuration_id: confId,
    category,
    category_index: categoryIndex,
    pn: item.pn,
    description: item.description,
    qty: item.qty,
    original_qty: item.qty,
    is_deleted: false,
    is_added: false,
    is_custom: !tsePns.has(item.pn),
    sort_order: sortOrder,
    tag: item.tag ?? null,
    bom_rules_version: BOM_RULES_VERSION,
  });

  generalBOM.forEach((item, index) => {
    items.push(toRow(item, "GENERAL", 0, index));
  });

  waterTankBOMs.forEach((tankBom, tankIndex) => {
    tankBom.forEach((item, itemIndex) => {
      items.push(toRow(item, "WATER_TANK", tankIndex, itemIndex));
    });
  });

  washBayBOMs.forEach((bayBom, bayIndex) => {
    bayBom.forEach((item, itemIndex) => {
      items.push(toRow(item, "WASH_BAY", bayIndex, itemIndex));
    });
  });

  return items;
}

export async function snapshotEngineeringBomAction(confId: number) {
  const auth = await authorizeEngineeringBomAction(confId);
  if (!auth.success) {
    return auth;
  }

  const alreadyExists = await hasEngineeringBom(confId);
  if (alreadyExists) {
    return {
      success: false as const,
      error: MSG.bom.alreadyExists,
    }
  }

  try {
    const items = await prepareBomItems(auth.configuration)
    await insertEngineeringBomItems(items);

    revalidatePath(`/configurations/bom/${confId}`);
    return { success: true as const };
  } catch (err) {
    console.error("Failed to snapshot engineering BOM:", err);
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      return { success: false as const, error: MSG.db.error };
    }
    return { success: false as const, error: MSG.db.unknown };
  }
}

export async function regenerateEngineeringBomAction(confId: number) {
  const auth = await authorizeEngineeringBomAction(confId);
  if (!auth.success) {
    return auth;
  }

  try {
    const items = await prepareBomItems(auth.configuration)
    await db.transaction(async (tx) => {
      await tx
        .delete(engineeringBomItems)
        .where(eq(engineeringBomItems.configuration_id, confId));
      if (items.length > 0) {
        await tx.insert(engineeringBomItems).values(items);
      }
    });

    revalidatePath(`/configurations/bom/${confId}`);
    return { success: true as const };
  } catch (err) {
    console.error("Failed to regenerate engineering BOM:", err);
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      return { success: false as const, error: MSG.db.error };
    }
    return { success: false as const, error: MSG.db.unknown };
  }
}

export async function addEngineeringBomItemAction(
  confId: number,
  formData: unknown
) {
  // 1. Unified Authorization Check
  const auth = await authorizeEngineeringBomAction(confId);
  if (!auth.success) return auth;

  // 2. Schema Validation
  const validation = engineeringBomItemSchema.safeParse(formData);
  if (!validation.success) {
    return {
      success: false as const,
      error: validation.error.errors.map((e) => e.message).join(", "),
    };
  }

  const { pn, qty, description, category, category_index, is_custom, tag } =
    validation.data;

  try {
    // 3. Atomic Insert with SQL Subquery
    // This removes the need for a separate "findMany" query to get the max order
    await db.insert(engineeringBomItems).values({
      configuration_id: confId,
      category,
      category_index,
      pn,
      description,
      qty,
      original_qty: null,
      is_deleted: false,
      is_added: true,
      is_custom: is_custom ?? false,
      tag: tag ?? null,
      sort_order: sql`(
        SELECT COALESCE(MAX(${engineeringBomItems.sort_order}), -1) + 1 
        FROM ${engineeringBomItems} 
        WHERE ${engineeringBomItems.configuration_id} = ${confId}
        AND ${engineeringBomItems.category} = ${category}
        AND ${engineeringBomItems.category_index} = ${category_index}
      )`,
    });

    // 4. Cache Invalidation
    revalidatePath(`/configurations/bom/${confId}`);
    return { success: true as const };

  } catch (err) {
    console.error("Failed to add BOM item:", err);
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      return { success: false as const, error: MSG.db.error };
    }
    return { success: false as const, error: MSG.db.unknown };
  }
}

export async function updateEngineeringBomItemQtyAction(
  confId: number,
  itemId: number,
  qty: number
) {
  const auth = await authorizeEngineeringBomAction(confId);
  if (!auth.success) {
    return auth;
  }

  if (!Number.isInteger(qty) || qty < 1) {
    return {
      success: false as const,
      error: MSG.bom.invalidQty,
    }
  }

  try {
    const [updated] = await db
      .update(engineeringBomItems)
      .set({ qty })
      .where(
        and(
          eq(engineeringBomItems.id, itemId),
          eq(engineeringBomItems.configuration_id, confId)
        )
      )
      .returning({ id: engineeringBomItems.id });

    if (!updated) {
      return {
        success: false as const,
        error: MSG.bom.rowNotFound,
      }
    }

    revalidatePath(`/configurations/bom/${confId}`);
    return { success: true as const };
  } catch (err) {
    console.error("Failed to update BOM item qty:", err);
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      return { success: false as const, error: MSG.db.error };
    }
    return { success: false as const, error: MSG.db.unknown };
  }
}

export async function toggleDeleteEngineeringBomItemAction(
  confId: number,
  itemId: number
) {
  const auth = await authorizeEngineeringBomAction(confId);
  if (!auth.success) {
    return auth;
  }

  try {
    const item = await db.query.engineeringBomItems.findFirst({
      where: and(
        eq(engineeringBomItems.id, itemId),
        eq(engineeringBomItems.configuration_id, confId)
      ),
      columns: { is_deleted: true },
    });

    if (!item) {
      return {
        success: false as const,
        error: MSG.bom.rowNotFound,
      }
    }

    await db
      .update(engineeringBomItems)
      .set({ is_deleted: !item.is_deleted })
      .where(eq(engineeringBomItems.id, itemId));

    revalidatePath(`/configurations/bom/${confId}`);
    return { success: true as const };
  } catch (err) {
    console.error("Failed to toggle delete BOM item:", err);
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      return { success: false as const, error: MSG.db.error };
    }
    return { success: false as const, error: MSG.db.unknown };
  }
}

export async function searchPartNumbersAction(query: string) {
  const user = await getUserData();
  if (!user) {
    return { success: false as const, error: MSG.auth.userNotAuthenticated };
  }

  if (!query || query.trim().length === 0) {
    return { success: true as const, data: [] };
  }

  try {
    const results = await searchPartNumbers(query.trim(), 20);
    return { success: true as const, data: results };
  } catch (err) {
    console.error("Failed to search part numbers:", err);
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      return { success: false as const, error: MSG.db.error };
    }
    return { success: false as const, error: MSG.db.unknown };
  }
}
