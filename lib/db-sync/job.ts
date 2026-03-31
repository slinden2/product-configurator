import { db } from "@/db";
import { NewPartNumber, partNumbers, pnTypeEnum } from "@/db/schemas";
import { fetchPartNumbersFromTSE } from "@/lib/db-sync/tse";
import { sql } from "drizzle-orm";

const BATCH_SIZE = 1000;

function mapPnType(value: number): "PART" | "ASSY" {
  if (value === 1) return "ASSY";
  if (value === 2) return "PART";

  throw new Error(`Invalid pn_type value: ${value}`);
}

function isPartNumberArray(array: any): array is NewPartNumber[] {
  return array.every(
    (item: any) =>
      typeof item.pn === "string" &&
      typeof item.description === "string" &&
      pnTypeEnum.enumValues.includes(item.pn_type) &&
      (item.is_phantom === false || item.is_phantom === true) &&
      typeof item.cost === "string",
  );
}

async function batchUpsert() {
  console.log("Starting batchUpsert function...");

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

await batchUpsert();
