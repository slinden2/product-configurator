import { inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  bomLines,
  type NewBomLine,
  type NewPartNumber,
  partNumbers,
  pnTypeEnum,
} from "@/db/schemas";
import {
  fetchBomStructureFromTSE,
  fetchPartNumbersFromTSE,
} from "@/lib/db-sync/tse";

const BATCH_SIZE = 1000;

function mapPnType(value: number): "PART" | "ASSY" {
  if (value === 1) return "ASSY";
  if (value === 2) return "PART";

  throw new Error(`Invalid pn_type value: ${value}`);
}

// biome-ignore lint/suspicious/noExplicitAny: type guard requires any for runtime validation
function isPartNumberArray(array: any): array is NewPartNumber[] {
  return array.every(
    // biome-ignore lint/suspicious/noExplicitAny: type guard requires any for runtime validation
    (item: any) =>
      typeof item.pn === "string" &&
      typeof item.description === "string" &&
      pnTypeEnum.enumValues.includes(item.pn_type) &&
      (item.is_phantom === false || item.is_phantom === true) &&
      typeof item.cost === "string",
  );
}

export async function batchUpsertPartNumbers() {
  console.log("Starting batchUpsertPartNumbers function...");

  console.time("Fetch records from TSE");
  const rawPartNumbers = await fetchPartNumbersFromTSE();
  console.timeEnd("Fetch records from TSE");

  if (rawPartNumbers.length === 0) {
    console.warn("No records fetched from TSE — sync skipped.");
    return;
  }

  const cleanPartNumbers = rawPartNumbers.map((obj) => ({
    pn: obj.pn.trim(),
    description: obj.description.trim(),
    cost: String(obj.cost ?? 0),
    pn_type: mapPnType(Number(obj.pn_type)),
    is_phantom: Boolean(obj.is_phantom),
  }));

  if (!isPartNumberArray(cleanPartNumbers)) {
    throw new Error("Invalid part number array");
  }

  console.time("Update records in Supabase");
  for (let i = 0; i < cleanPartNumbers.length; i += BATCH_SIZE) {
    const batch = cleanPartNumbers.slice(i, i + BATCH_SIZE);
    await db
      .insert(partNumbers)
      .values(batch)
      .onConflictDoUpdate({
        target: partNumbers.pn,
        set: {
          description: sql`excluded.description`,
          cost: sql`excluded.cost`,
          pn_type: sql`excluded.pn_type`,
          is_phantom: sql`excluded.is_phantom`,
        },
      });
  }
  console.timeEnd("Update records in Supabase");
  console.log(
    `Upsert completed: ${cleanPartNumbers.length} records in ${Math.ceil(cleanPartNumbers.length / BATCH_SIZE)} batch(es).`,
  );
}

// biome-ignore lint/suspicious/noExplicitAny: type guard requires any for runtime validation
function isBomLineInsertArray(array: any): array is NewBomLine[] {
  return array.every(
    // biome-ignore lint/suspicious/noExplicitAny: type guard requires any for runtime validation
    (item: any) =>
      typeof item.parent_pn === "string" &&
      typeof item.child_pn === "string" &&
      typeof item.qty === "string" &&
      typeof item.sort_order === "number",
  );
}

export async function batchUpsertBomStructure() {
  console.log("Starting batchUpsertBomStructure function...");

  console.time("Fetch BOM structure from TSE");
  const raw = await fetchBomStructureFromTSE();
  console.timeEnd("Fetch BOM structure from TSE");

  if (raw.length === 0) {
    console.warn(
      "No BOM structure rows fetched from TSE — structure sync skipped.",
    );
    return;
  }

  const clean: NewBomLine[] = raw.map((r) => ({
    parent_pn: r.parent_pn.trim(),
    child_pn: r.child_pn.trim(),
    qty: String(r.qty),
    sort_order: Number(r.sort_order),
  }));

  if (!isBomLineInsertArray(clean)) {
    throw new Error("Invalid BOM structure array");
  }

  const incomingParents = Array.from(new Set(clean.map((r) => r.parent_pn)));

  console.time("Replace BOM structure in Supabase");
  await db.transaction(async (tx) => {
    await tx
      .delete(bomLines)
      .where(inArray(bomLines.parent_pn, incomingParents));
    for (let i = 0; i < clean.length; i += BATCH_SIZE) {
      await tx.insert(bomLines).values(clean.slice(i, i + BATCH_SIZE));
    }
  });
  console.timeEnd("Replace BOM structure in Supabase");
  console.log(
    `BOM structure sync completed: ${clean.length} rows across ${incomingParents.length} parents, in ${Math.ceil(clean.length / BATCH_SIZE)} batch(es).`,
  );
}
