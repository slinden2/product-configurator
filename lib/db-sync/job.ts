import { db } from "@/db";
import { partNumbers } from "@/db/schemas";
import { fetchPartNumbersFromTSE } from "@/lib/db-sync/tse";
import { sql } from "drizzle-orm";

async function batchUpsert() {
  console.log("Starting batchUpsert function...");

  console.time("Fetch records from TSE");
  const rawPartNumbers = await fetchPartNumbersFromTSE();
  console.timeEnd("Fetch records from TSE");

  if (rawPartNumbers) {
    const cleanPartNumbers = rawPartNumbers.map((obj) => ({
      pn: obj.pn.trim(),
      description: obj.description.trim(),
    }));

    console.time("Update records in Supabase");
    await db
      .insert(partNumbers)
      .values(cleanPartNumbers)
      .onConflictDoUpdate({
        target: partNumbers.pn,
        set: { description: sql`excluded.description` },
      });
    console.timeEnd("Update records in Supabase");
    console.log("Bulk upsert completed using raw SQL.");
  }
}

await batchUpsert();
