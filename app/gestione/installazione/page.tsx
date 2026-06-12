import { getInstallationItemSettings } from "@/db/queries";
import InstallationItemsTable from "./installation-items-table";

export default async function InstallazionePage() {
  const rows = await getInstallationItemSettings();
  return <InstallationItemsTable rows={rows} />;
}
