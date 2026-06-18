import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isEditable } from "@/app/actions/lib/auth-checks";
import ConfigNavigationBar from "@/components/config-navigation-bar";
import StatusForm from "@/components/status-form";
import { Button } from "@/components/ui/button";
import { loadValidatedConfiguration } from "@/db/load-validated-configuration";
import { getUserData } from "@/db/queries";
import ConfigView from "./config-view";
import ExportConfigPdfButton from "./export-config-pdf-button";

interface ViewConfigProps {
  params: Promise<{ id: string }>;
}

const ViewConfiguration = async (props: ViewConfigProps) => {
  const params = await props.params;
  const id = parseInt(params.id, 10);
  if (Number.isNaN(id)) notFound();

  const user = await getUserData();
  if (!user) redirect("/login");

  const loaded = await loadValidatedConfiguration(id, user);
  if (!loaded) notFound();

  const { configuration, status, waterTanks, washBays } = loaded;
  const editable = isEditable(status, user.role);

  return (
    <div>
      <ConfigNavigationBar confId={id} activePage="config" role={user.role} />
      <div className="mb-6 sm:flex sm:gap-2">
        <div className="mb-6 sm:mb-0">
          <h1 className="text-3xl font-bold mb-2">Visualizza configurazione</h1>
          <p className="text-muted-foreground">
            {configuration.name || "Configurazione"}
          </p>
        </div>
        <div className="flex items-end gap-2 sm:ml-auto">
          <StatusForm confId={id} initialStatus={status} userRole={user.role} />
          <ExportConfigPdfButton
            confId={id}
            configuration={configuration}
            waterTanks={waterTanks}
            washBays={washBays}
            generatorEmail={null}
          />
          {editable && (
            <Button asChild>
              <Link href={`/configurazioni/modifica/${id}`}>
                <Pencil />
                Modifica
              </Link>
            </Button>
          )}
        </div>
      </div>
      <ConfigView
        configuration={configuration}
        waterTanks={waterTanks}
        washBays={washBays}
      />
    </div>
  );
};

export default ViewConfiguration;
