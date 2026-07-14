import {
  setRevisionDiscountAction,
  setRevisionSettingsAction,
} from "@/app/actions/offer-revision-actions";
import OfferSettingsCard from "@/components/offer/offer-settings-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OfferWithRevisionAndLines } from "@/db/queries";
import { prepareOfferDisplayData } from "@/lib/offer";
import {
  computeOfferSummaryExtras,
  parseOfferSettings,
} from "@/lib/offer-settings";
import { formatEur } from "@/lib/utils";
import LineBreakdown from "./line-breakdown";

interface Props {
  offerId: number;
  customerName: string;
  revision: OfferWithRevisionAndLines["revisions"][number];
  editable: boolean;
}

export default function QuoteView({
  offerId,
  customerName,
  revision,
  editable,
}: Props) {
  const lines = revision.lines;
  const discountPct = Number(revision.discount_pct);
  const settings = parseOfferSettings(revision);
  const showPrices = !settings.show_net_total_only;

  // Offer-level totals are the sum of each line's stored per-unit pricing × its
  // quantity. The discounted total (sum of line nets) is authoritative; the header
  // discount and transport/installation apply once, at the offer level.
  const totalListPrice = lines.reduce(
    (sum, line) => sum + Number(line.list_price) * line.quantity,
    0,
  );
  const discountedTotal = lines.reduce(
    (sum, line) => sum + Number(line.net_price) * line.quantity,
    0,
  );
  const extras = computeOfferSummaryExtras(settings, discountedTotal);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Offerta economica</h2>

      {lines.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nessuna configurazione da quotare.
        </p>
      )}

      {lines.map((line) => {
        const { displayData, surcharges } = prepareOfferDisplayData(
          line.pricing_snapshot,
          discountPct,
        );
        const title = `Pos. ${line.position + 1} — ${customerName}`;

        if (!displayData) {
          return (
            <Card key={line.id}>
              <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Prezzo non disponibile — modifica la configurazione per
                  ricalcolare.
                </p>
              </CardContent>
            </Card>
          );
        }

        return (
          <LineBreakdown
            key={line.id}
            title={title}
            data={displayData}
            surcharges={surcharges}
            showPrices={showPrices}
            quantity={line.quantity}
            unitListPrice={Number(line.list_price)}
          />
        );
      })}

      {editable && (
        // Keyed on the revision's updated_at so the card (and the nested
        // DiscountInput) remounts with fresh initial props whenever the server
        // state changes — e.g. a concurrent edit by another user within scope
        // (manager + agent can both edit a DRAFT revision). Without the key the
        // mounted card would keep displaying and re-saving its stale snapshot.
        <OfferSettingsCard
          key={revision.updated_at.getTime()}
          initialDiscount={discountPct}
          initialSettings={settings}
          onSaveDiscount={setRevisionDiscountAction.bind(null, offerId)}
          onSaveSettings={setRevisionSettingsAction.bind(null, offerId)}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Riepilogo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {showPrices && (
              <>
                <div className="flex justify-between text-base font-semibold">
                  <span>Totale listino</span>
                  <span className="tabular-nums">
                    {formatEur(totalListPrice)}
                  </span>
                </div>
                {discountPct > 0 && (
                  <div className="flex justify-between text-sm text-amber-600 dark:text-amber-400">
                    <span>Sconto {discountPct}%</span>
                    <span className="tabular-nums">
                      -{formatEur(totalListPrice - discountedTotal)}
                    </span>
                  </div>
                )}
                {discountedTotal !== totalListPrice && (
                  <div className="flex justify-between text-base font-bold text-green-600 dark:text-green-400">
                    <span>Totale scontato</span>
                    <span className="tabular-nums">
                      {formatEur(discountedTotal)}
                    </span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between text-sm">
              <span>{extras.transportRow.label}</span>
              {extras.transportRow.amount !== null && (
                <span className="tabular-nums font-semibold">
                  {formatEur(extras.transportRow.amount)}
                </span>
              )}
            </div>
            <div className="flex justify-between text-sm">
              <span>{extras.installationRow.label}</span>
              {extras.installationRow.amount !== null && (
                <span className="tabular-nums font-semibold">
                  {formatEur(extras.installationRow.amount)}
                </span>
              )}
            </div>
            {(!showPrices || extras.hasNetAdjustments) && (
              <div className="flex justify-between text-base font-bold text-green-600 dark:text-green-400">
                <span>Totale netto</span>
                <span className="tabular-nums">
                  {formatEur(extras.net_total)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
