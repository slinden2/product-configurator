import { getInstallationItemSettings } from "@/db/queries";
import { gestioneRouteGuard } from "../lib/gestione-route-guard";
import InstallationItemsTable from "./installation-items-table";

export default async function InstallazionePage() {
  await gestioneRouteGuard();
  const rows = await getInstallationItemSettings();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Installazione</h1>
      <InstallationItemsTable rows={rows} />
    </div>
  );
}
