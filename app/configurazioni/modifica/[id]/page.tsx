import { Eye } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isEditable } from "@/app/actions/lib/auth-checks";
import ConfigNavigationBar from "@/components/config-navigation-bar";
import FormContainer from "@/components/form-container";
import { Button } from "@/components/ui/button";
import { loadValidatedConfiguration } from "@/db/load-validated-configuration";
import {
  getOfferFreezeState,
  getUserData,
  hasEngineeringBom,
} from "@/db/queries";
import { isOfferFrozen } from "@/lib/offer";

interface EditConfigProps {
  params: Promise<{ id: string }>;
}

const EditConfiguration = async (props: EditConfigProps) => {
  const params = await props.params;
  const id = parseInt(params.id, 10);
  if (Number.isNaN(id)) notFound();

  const user = await getUserData();
  if (!user) redirect("/login");

  const loaded = await loadValidatedConfiguration(id, user);
  if (!loaded) notFound();

  const {
    configuration: validatedConfiguration,
    status,
    waterTanks: validatedWaterTanks,
    washBays: validatedWashBays,
  } = loaded;

  // Once a config is frozen (or the user otherwise lacks edit rights) there is
  // nothing to edit here — send them to the read-only view instead of rendering
  // a disabled form.
  if (!isEditable(status, user.role)) {
    redirect(`/configurazioni/visualizza/${id}`);
  }

  const [ebomExists, offerFreeze] = await Promise.all([
    hasEngineeringBom(id),
    getOfferFreezeState(id),
  ]);

  // A frozen offer is the immutable as-sold record and survives edits, so the
  // save warning must not threaten to delete it — only an unfrozen offer is at
  // risk of being regenerated.
  const offerWillBeDeleted =
    offerFreeze !== null && !isOfferFrozen(offerFreeze);

  return (
    <div>
      <ConfigNavigationBar confId={id} activePage="config" role={user.role} />
      <div className="mb-6 sm:flex sm:gap-2">
        <div className="mb-6 sm:mb-0">
          <h1 className="text-3xl font-bold mb-2">Modifica configurazione</h1>
          <p className="text-muted-foreground">
            Modifica con il form sottostante la configurazione del tuo cliente.
          </p>
        </div>
        <div className="sm:ml-auto sm:flex sm:justify-center sm:items-center">
          <Button asChild variant="outline">
            <Link href={`/configurazioni/visualizza/${id}`}>
              <Eye />
              Visualizza configurazione
            </Link>
          </Button>
        </div>
      </div>
      <FormContainer
        confId={id}
        configuration={validatedConfiguration}
        confStatus={status}
        userRole={user.role}
        initialWaterTanks={validatedWaterTanks}
        initialWashBays={validatedWashBays}
        hasEngineeringBom={ebomExists}
        hasOfferSnapshot={offerWillBeDeleted}
      />
    </div>
  );
};

export default EditConfiguration;
