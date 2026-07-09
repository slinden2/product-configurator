import { eq, inArray, sql } from "drizzle-orm";
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

function chunk<T>(items: T[], size = BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// Exported for unit tests
export function mapPnType(value: number): "PART" | "ASSY" {
  if (value === 1) return "ASSY";
  if (value === 2) return "PART";

  throw new Error(`Invalid pn_type value: ${value}`);
}

// Exported for unit tests
// biome-ignore lint/suspicious/noExplicitAny: type guard requires any for runtime validation
export function isPartNumberArray(array: any): array is NewPartNumber[] {
  return array.every(
    // biome-ignore lint/suspicious/noExplicitAny: type guard requires any for runtime validation
    (item: any) =>
      typeof item.pn === "string" &&
      typeof item.description === "string" &&
      pnTypeEnum.enumValues.includes(item.pn_type) &&
      (item.is_phantom === false || item.is_phantom === true) &&
      typeof item.cost === "string" &&
      (item.is_subcontract === false || item.is_subcontract === true) &&
      (item.family === null || typeof item.family === "string") &&
      (item.sub_family === null || typeof item.sub_family === "string"),
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
    is_subcontract: Boolean(obj.is_subcontract),
    family: obj.family?.trim() || null,
    sub_family: obj.sub_family?.trim() || null,
  }));

  if (!isPartNumberArray(cleanPartNumbers)) {
    throw new Error("Invalid part number array");
  }

  console.time("Update records in Supabase");
  for (const batch of chunk(cleanPartNumbers)) {
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
          is_subcontract: sql`excluded.is_subcontract`,
          family: sql`excluded.family`,
          sub_family: sql`excluded.sub_family`,
          // A pn that reappears in the ERP extract is active again
          is_active: true,
        },
      });
  }
  console.timeEnd("Update records in Supabase");
  console.log(
    `Upsert completed: ${cleanPartNumbers.length} records in ${Math.ceil(cleanPartNumbers.length / BATCH_SIZE)} batch(es).`,
  );

  // Soft-delete pns no longer present in the ERP extract. The stale set is
  // diffed in JS (a NOT IN with the full incoming list would blow the
  // Postgres 65535 bind-parameter limit) and the update is chunked for the
  // same reason. Rows are kept so frozen engineering BOMs and coefficients
  // still resolve; only the UI part picker filters on is_active.
  const incomingPns = new Set(cleanPartNumbers.map((p) => p.pn));
  const localActive = await db
    .select({ pn: partNumbers.pn })
    .from(partNumbers)
    .where(eq(partNumbers.is_active, true));
  const stalePns = localActive
    .map((row) => row.pn)
    .filter((pn) => !incomingPns.has(pn));
  for (const batch of chunk(stalePns)) {
    await db
      .update(partNumbers)
      .set({ is_active: false })
      .where(inArray(partNumbers.pn, batch));
  }
  console.log(
    `Deactivated ${stalePns.length} part number(s) no longer present in the ERP extract.`,
  );
}

// Exported for unit tests
// biome-ignore lint/suspicious/noExplicitAny: type guard requires any for runtime validation
export function isBomLineInsertArray(array: any): array is NewBomLine[] {
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

  const incomingParentSet = new Set(clean.map((r) => r.parent_pn));
  const incomingParents = Array.from(incomingParentSet);

  console.time("Replace BOM structure in Supabase");
  let staleParentCount = 0;
  await db.transaction(async (tx) => {
    // Parents deleted in the ERP never reappear in the extract, so their
    // lines must be removed explicitly or they linger as ghost assemblies.
    const localParents = await tx
      .selectDistinct({ parent_pn: bomLines.parent_pn })
      .from(bomLines);
    const staleParents = localParents
      .map((row) => row.parent_pn)
      .filter((parentPn) => !incomingParentSet.has(parentPn));
    staleParentCount = staleParents.length;

    // Deletes are chunked like the inserts: a single inArray over every
    // parent would exceed the Postgres 65535 bind-parameter limit.
    for (const batch of chunk(incomingParents)) {
      await tx.delete(bomLines).where(inArray(bomLines.parent_pn, batch));
    }
    for (const batch of chunk(staleParents)) {
      await tx.delete(bomLines).where(inArray(bomLines.parent_pn, batch));
    }
    for (const batch of chunk(clean)) {
      await tx.insert(bomLines).values(batch);
    }
  });
  console.timeEnd("Replace BOM structure in Supabase");
  console.log(
    `Removed BOM lines for ${staleParentCount} stale parent(s) deleted in the ERP.`,
  );
  console.log(
    `BOM structure sync completed: ${clean.length} rows across ${incomingParents.length} parents, in ${Math.ceil(clean.length / BATCH_SIZE)} batch(es).`,
  );
}
