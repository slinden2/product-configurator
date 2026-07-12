import { getAllPriceCoefficients } from "@/db/queries";
import {
  collectMaxBomPns,
  computeMaxBomCoefficientDiff,
  DEFAULT_COEFFICIENT,
} from "@/lib/pricing";
import { gestioneRouteGuard } from "../lib/gestione-route-guard";
import CoefficientsTable from "./coefficients-table";

export default async function CoefficientsPage() {
  await gestioneRouteGuard();
  const rows = await getAllPriceCoefficients();
  const { missing: missingMaxBomPns, orphans: orphanPns } =
    computeMaxBomCoefficientDiff(rows, collectMaxBomPns());

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
