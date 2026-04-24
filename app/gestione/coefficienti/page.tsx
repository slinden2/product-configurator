import { getAllPriceCoefficients } from "@/db/queries";
import { collectMaxBomPns, DEFAULT_COEFFICIENT } from "@/lib/pricing";
import CoefficientsTable from "./coefficients-table";

export default async function CoefficientsPage() {
  const rows = await getAllPriceCoefficients();
  const maxBomPns = collectMaxBomPns();

  const existingPns = new Set(rows.map((r) => r.pn));
  const missingMaxBomPns = maxBomPns.filter((pn) => !existingPns.has(pn));
  const orphanPns = rows
    .filter((r) => r.source === "MAXBOM" && !maxBomPns.includes(r.pn))
    .map((r) => r.pn);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Coefficienti</h1>
      <CoefficientsTable
        rows={rows}
        missingMaxBomPns={missingMaxBomPns}
        orphanPns={orphanPns}
        defaultCoefficient={DEFAULT_COEFFICIENT}
      />
    </div>
  );
}
