import { fetchPartNumbersFromTSE } from "@/lib/dbSync/tse";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function batchUpsert() {
  console.log("Starting batchUpsert function...");

  console.time("Fetch records from TSE");
  const partNumbers = await fetchPartNumbersFromTSE();
  console.timeEnd("Fetch records from TSE");

  if (partNumbers) {
    const values = partNumbers
      .map(
        (item) =>
          `('${item.pn.trim()}', '${item.description
            .trim()
            .replaceAll("'", "''")}')`
      )
      .join(",");

    const sql = `
      INSERT INTO "part_numbers" (pn, description)
      VALUES ${values}
      ON CONFLICT (pn) DO UPDATE SET description = EXCLUDED.description;
    `;

    // console.log(sql);

    console.time("Update records in Supabase");
    await prisma.$executeRawUnsafe(sql);
    console.timeEnd("Update records in Supabase");
    console.log("Bulk upsert completed using raw SQL.");
  }
}

batchUpsert()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    prisma.$disconnect();
  });
