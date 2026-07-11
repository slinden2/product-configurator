import { getSurchargeSettings } from "@/db/queries";
import { gestioneRouteGuard } from "../lib/gestione-route-guard";
import SurchargesTable from "./surcharges-table";

export default async function MaggiorazioniPage() {
  await gestioneRouteGuard();
  const rows = await getSurchargeSettings();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Maggiorazioni</h1>
      <SurchargesTable rows={rows} />
    </div>
  );
}
