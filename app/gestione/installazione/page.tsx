import { getInstallationItemSettings } from "@/db/queries";
import { gestioneRouteGuard } from "../lib/gestione-route-guard";
import InstallationItemsTable from "./installation-items-table";

export default async function InstallazionePage() {
  await gestioneRouteGuard();
  const rows = await getInstallationItemSettings();
  return <InstallationItemsTable rows={rows} />;
}
