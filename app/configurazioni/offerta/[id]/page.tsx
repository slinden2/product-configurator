import { AlertTriangle, FileCheck } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isEditable } from "@/app/actions/lib/auth-checks";
import ConfigNavigationBar from "@/components/config-navigation-bar";
import AlertBanner from "@/components/shared/alert-banner";
import DetailsCard from "@/components/shared/details-card";
import { Button } from "@/components/ui/button";
import {
  getConfiguration,
  getOfferSnapshotByConfigurationId,
  getUserData,
  offerRevisionStatusFor,
} from "@/db/queries";
import { MSG } from "@/lib/messages";
import {
  isOfferFrozen,
  isOfferStale,
  OFFER_STALENESS_DAYS,
  prepareOfferDisplayData,
} from "@/lib/offer";
import {
  DEFAULT_OFFER_SETTINGS,
  parseOfferSettings,
} from "@/lib/offer-settings";
import { formatDateDDMMYYYYHHMM } from "@/lib/utils";
import ExportOfferButton from "./export-offer-button";
import ExportOfferPdfButton from "./export-offer-pdf-button";
import OfferActionButton from "./offer-action-button";
import OfferView from "./offer-view";

interface OfferPageProps {
  params: Promise<{ id: string }>;
}

const OfferPage = async (props: OfferPageProps) => {
  const params = await props.params;
  const confId = parseInt(params.id, 10);
  if (Number.isNaN(confId)) notFound();

  const user = await getUserData();
  if (!user) redirect("/login");

  const [configuration, snapshot] = await Promise.all([
    getConfiguration(confId),
    getOfferSnapshotByConfigurationId(confId),
  ]);

  if (!configuration) notFound();

  const offerRevisionStatus = await offerRevisionStatusFor(configuration);
  const editable = isEditable(
    configuration.status,
    user.role,
    configuration.origin,
    offerRevisionStatus,
  );
  const frozen = isOfferFrozen(snapshot);
  // A frozen offer is immutable: regeneration and commercial-term edits are
  // both blocked server-side, so the controls must be hidden/disabled too.
  const offerMutable = editable && !frozen;
  const stale = snapshot ? isOfferStale(snapshot, configuration.status) : false;
  const expiredDays = snapshot
    ? Math.floor(
        (Date.now() - new Date(snapshot.generated_at).getTime()) /
          (1000 * 60 * 60 * 24),
      ) - OFFER_STALENESS_DAYS
    : 0;

  const discountPct = snapshot ? Number(snapshot.discount_pct) : 0;
  const settings = snapshot
    ? parseOfferSettings(snapshot)
    : DEFAULT_OFFER_SETTINGS;
  const { displayData, surcharges } = snapshot
    ? prepareOfferDisplayData(snapshot.items, discountPct)
    : { displayData: null, surcharges: [] };

  const sourceLabel =
    snapshot?.source === "EBOM" ? "distinta di commessa" : "calcolo automatico";

  return (
    <div className="space-y-6">
      <ConfigNavigationBar
        confId={confId}
        activePage="offerta"
        role={user.role}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="inline-block">Offerta</h1>
        <div className="flex flex-wrap items-center gap-2">
          {!snapshot && editable && (
            <OfferActionButton confId={confId} mode="generate" />
          )}
          {snapshot && offerMutable && (
            <OfferActionButton confId={confId} mode="regenerate" />
          )}
          {frozen && (
            <Button asChild variant="outline">
              <Link href={`/configurazioni/offerta/${confId}/come-venduto`}>
                <FileCheck />
                Configurazione come venduta
              </Link>
            </Button>
          )}
          {snapshot && displayData && (
            <>
              <ExportOfferButton
                data={{ ...displayData, surcharges }}
                user={user}
                discountPct={discountPct}
                settings={settings}
              />
              <ExportOfferPdfButton
                data={{ ...displayData, surcharges }}
                meta={{
                  confId,
                  clientName: configuration.name,
                  generatedAt: formatDateDDMMYYYYHHMM(snapshot.generated_at),
                  generatorEmail: snapshot.generator?.email ?? null,
                  sourceLabel,
                }}
                discountPct={discountPct}
                settings={settings}
              />
            </>
          )}
        </div>
      </div>

      <DetailsCard
        clientName={configuration.name}
        description={configuration.description}
      />

      {stale && snapshot && (
        <AlertBanner
          variant="error"
          icon={<AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
          title={MSG.offer.staleness.title}
        >
          {MSG.offer.staleness.body(
            formatDateDDMMYYYYHHMM(snapshot.generated_at),
            expiredDays,
          )}
        </AlertBanner>
      )}
      {!snapshot && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="mb-4">
            Nessuna offerta generata per questa configurazione.
          </p>
          {editable && <OfferActionButton confId={confId} mode="generate" />}
        </div>
      )}

      {snapshot && (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Offerta generata il {formatDateDDMMYYYYHHMM(snapshot.generated_at)}
            {snapshot.generator?.email && <> da {snapshot.generator.email}</>} —
            fonte: {sourceLabel}
          </p>
          {frozen && snapshot.frozen_at && (
            <p>
              Offerta congelata come venduta il{" "}
              {formatDateDDMMYYYYHHMM(snapshot.frozen_at)}.
            </p>
          )}
        </div>
      )}

      {displayData && (
        <OfferView
          data={displayData}
          surcharges={surcharges}
          confId={confId}
          discountPct={discountPct}
          settings={settings}
          editable={offerMutable}
          stale={stale}
        />
      )}
    </div>
  );
};

export default OfferPage;
