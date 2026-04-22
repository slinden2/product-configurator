import { AlertTriangle, Info } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { isEditable } from "@/app/actions/lib/auth-checks";
import ConfigNavigationBar from "@/components/config-navigation-bar";
import AlertBanner from "@/components/shared/alert-banner";
import {
  getConfiguration,
  getEbomMaxUpdatedAt,
  getOfferSnapshotByConfigurationId,
  getUserData,
} from "@/db/queries";
import { MSG } from "@/lib/messages";
import {
  detectEbomDrift,
  groupItemsForDisplay,
  isOfferStale,
  OFFER_STALENESS_DAYS,
} from "@/lib/offer";
import { formatDateDDMMYYYYHHMM } from "@/lib/utils";
import { offerSnapshotItemsSchema } from "@/validation/offer-schema";
import DiscountInput from "./discount-input";
import OfferActionButton from "./offer-action-button";
import OfferView from "./offer-view";

interface OffertaProps {
  params: Promise<{ id: string }>;
}

const OffertaView = async (props: OffertaProps) => {
  const params = await props.params;
  const confId = parseInt(params.id, 10);
  if (Number.isNaN(confId)) notFound();

  const user = await getUserData();
  if (!user) redirect("/login");

  const [configuration, snapshot, ebomMaxUpdatedAt] = await Promise.all([
    getConfiguration(confId),
    getOfferSnapshotByConfigurationId(confId),
    getEbomMaxUpdatedAt(confId),
  ]);

  if (!configuration) notFound();

  const editable = isEditable(configuration.status, user.role);
  const stale = snapshot ? isOfferStale(snapshot, configuration.status) : false;
  const drift = snapshot ? detectEbomDrift(snapshot, ebomMaxUpdatedAt) : "none";
  const expiredDays = snapshot
    ? Math.floor(
        (Date.now() - new Date(snapshot.generated_at).getTime()) /
          (1000 * 60 * 60 * 24),
      ) - OFFER_STALENESS_DAYS
    : 0;

  const parsedItems = snapshot
    ? offerSnapshotItemsSchema.safeParse(snapshot.items)
    : null;
  const items = parsedItems?.success ? parsedItems.data : [];

  const discountPct = snapshot ? Number(snapshot.discount_pct) : 0;
  const displayData =
    items.length > 0 ? groupItemsForDisplay(items, discountPct) : null;

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
          {snapshot && editable && (
            <OfferActionButton confId={confId} mode="regenerate" />
          )}
          {snapshot && editable && (
            <DiscountInput
              confId={confId}
              initialDiscount={discountPct}
              disabled={stale}
            />
          )}
        </div>
      </div>

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
      {drift !== "none" && (
        <AlertBanner
          variant="info"
          icon={<Info className="h-4 w-4 mt-0.5 shrink-0" />}
          title={MSG.offer.drift.title}
        >
          {drift === "live_but_ebom_exists"
            ? MSG.offer.drift.liveButEbomExists
            : MSG.offer.drift.ebomChanged}
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
            fonte:{" "}
            {snapshot.source === "EBOM"
              ? "distinta di commessa"
              : "calcolo automatico"}
          </p>
        </div>
      )}

      {displayData && <OfferView data={displayData} />}
    </div>
  );
};

export default OffertaView;
