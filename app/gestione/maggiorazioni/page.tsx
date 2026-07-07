import { getSurchargeSettings } from "@/db/queries";
import { gestioneRouteGuard } from "../lib/gestione-route-guard";
import SurchargesTable from "./surcharges-table";

export default async function MaggiorazioniPage() {
  await gestioneRouteGuard();
  const rows = await getSurchargeSettings();
  return <SurchargesTable rows={rows} />;
}
