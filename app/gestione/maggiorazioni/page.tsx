import { getSurchargeSettings } from "@/db/queries";
import SurchargesTable from "./surcharges-table";

export default async function MaggiorazioniPage() {
  const rows = await getSurchargeSettings();
  return <SurchargesTable rows={rows} />;
}
