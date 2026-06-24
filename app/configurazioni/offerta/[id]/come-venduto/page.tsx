import { Info } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import ConfigNavigationBar from "@/components/config-navigation-bar";
import ConfigView from "@/components/config-view";
import AlertBanner from "@/components/shared/alert-banner";
import {
  getConfigurationWithTanksAndBays,
  getOfferSnapshotByConfigurationId,
  getUserData,
} from "@/db/queries";
import { isOfferFrozen } from "@/lib/offer";
import { formatDateDDMMYYYYHHMM } from "@/lib/utils";
import {
  type OfferConfigSnapshot,
  offerConfigSnapshotSchema,
} from "@/validation/offer-config-snapshot-schema";

interface AsSoldPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Read-only view of the configuration exactly as it was sold, captured on the
 * offer snapshot at the SALES_APPROVED freeze. It renders the frozen
 * config_snapshot through the same ConfigView the live read-only view uses, so
 * engineer edits made afterwards never change what is shown here.
 */
const AsSoldPage = async (props: AsSoldPageProps) => {
  const params = await props.params;
  const confId = parseInt(params.id, 10);
  if (Number.isNaN(confId)) notFound();

  const user = await getUserData();
  if (!user) redirect("/login");

  const [configuration, snapshot] = await Promise.all([
    // RLS-scoped access gate: returns null when the config is not visible.
    getConfigurationWithTanksAndBays(confId, user),
    getOfferSnapshotByConfigurationId(confId),
  ]);
  if (!configuration) notFound();

  return (
    <div>
      <ConfigNavigationBar
        confId={confId}
        activePage="offerta"
        role={user.role}
      />
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Configurazione come venduta</h1>
        <p className="text-muted-foreground">
          {configuration.name || "Configurazione"}
        </p>
      </div>

      {!isOfferFrozen(snapshot) || !snapshot?.config_snapshot ? (
        <AlertBanner
          variant="info"
          icon={<Info className="h-4 w-4 mt-0.5 shrink-0" />}
          title="Offerta non ancora congelata"
        >
          La configurazione come venduta sarà disponibile dopo l'approvazione
          dell'offerta.
        </AlertBanner>
      ) : (
        <AsSoldContent
          rawSnapshot={snapshot.config_snapshot}
          frozenAt={snapshot.frozen_at}
        />
      )}
    </div>
  );
};

interface AsSoldContentProps {
  rawSnapshot: unknown;
  frozenAt: Date | null;
}

const AsSoldContent = ({ rawSnapshot, frozenAt }: AsSoldContentProps) => {
  // Tolerant parse, mirroring loadValidatedConfiguration: stale enum values or
  // removed fields render as-is rather than crashing the page.
  const result = offerConfigSnapshotSchema.safeParse(rawSnapshot);
  const snapshot = (
    result.success ? result.data : rawSnapshot
  ) as OfferConfigSnapshot;

  return (
    <div className="space-y-6">
      {frozenAt && (
        <p className="text-sm text-muted-foreground">
          Configurazione come venduta il {formatDateDDMMYYYYHHMM(frozenAt)}.
        </p>
      )}
      <ConfigView
        configuration={snapshot.configuration}
        waterTanks={snapshot.waterTanks}
        washBays={snapshot.washBays}
      />
    </div>
  );
};

export default AsSoldPage;
