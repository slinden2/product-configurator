import { db } from "@/db";
import { NewPartNumber, partNumbers, pnTypeEnum } from "@/db/schemas";
import { fetchPartNumbersFromTSE } from "@/lib/db-sync/tse";
import { sql } from "drizzle-orm";
import fs from 'fs';

function mapPnType(value: number): "PART" | "ASSY" {
  if (value === 1) return "ASSY";
  if (value === 2) return "PART";

  throw new Error(`Invalid pn_type value: ${value}`);
}

function isPartNumberArray(array: any): array is NewPartNumber[] {
  return array.every((item: any) =>
    typeof item.pn === 'string' &&
    typeof item.description === 'string' &&
    pnTypeEnum.enumValues.includes(item.pn_type) &&
    item.is_phantom === false || item.is_phantom === true &&
    typeof item.cost === 'number' || item.cost === null
  );
}

async function batchUpsert() {
  console.log("Starting batchUpsert function...");

  console.time("Fetch records from TSE");
  const rawPartNumbers = await fetchPartNumbersFromTSE();
  console.timeEnd("Fetch records from TSE");

  if (rawPartNumbers) {
    const cleanPartNumbers = rawPartNumbers.map((obj) => {
      return {
        pn: obj.pn.trim(),
        description: obj.description.trim(),
        cost: obj.cost ? obj.cost : 0,
        pn_type: mapPnType(Number(obj.pn_type)),
        is_phantom: Boolean(obj.is_phantom),
      }
    });

    if (!isPartNumberArray(cleanPartNumbers)) {
      throw new Error("Invalid part number array");
    }

    console.time("Update records in Supabase");
    await db
      .insert(partNumbers)
      .values(cleanPartNumbers)
      .onConflictDoUpdate({
        target: partNumbers.pn,
        set: { description: sql`excluded.description`, cost: sql`excluded.cost` },
      });
    console.timeEnd("Update records in Supabase");
    console.log("Bulk upsert completed using raw SQL.");
  }
}

await batchUpsert();
