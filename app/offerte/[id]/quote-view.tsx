import {
  setRevisionDiscountAction,
  setRevisionSettingsAction,
} from "@/app/actions/offer-revision-actions";
import OfferSettingsCard from "@/components/offer/offer-settings-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OfferWithRevisionAndLines } from "@/db/queries";
import { prepareOfferDisplayData } from "@/lib/offer";
import {
  computeRevisionTotals,
  deriveOfferSummary,
  offerLineTitle,
} from "@/lib/offer-export";
import { buildSupplyConditions } from "@/lib/offer-settings";
import { formatEur } from "@/lib/utils";
import LineBreakdown from "./line-breakdown";

interface Props {
  offerId: number;
  customerName: string;
  /** Fallback for an empty "Destinazione" supply condition. */
  customerAddress: string | null;
  revision: OfferWithRevisionAndLines["revisions"][number];
  editable: boolean;
}

export default function QuoteView({
  offerId,
  customerName,
  customerAddress,
  revision,
  editable,
}: Props) {
  const lines = revision.lines;
  const discountPct = Number(revision.discount_pct);
  const { totalListPrice, discountedTotal } = computeRevisionTotals(revision);
  const { settings, showPrices, extras } = deriveOfferSummary(
    revision,
    discountedTotal,
  );
  const supplyConditions = buildSupplyConditions(settings, customerAddress);

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
        const title = offerLineTitle(line.position, customerName);

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
            {extras.extraDiscountRow && (
              <div className="flex justify-between text-sm text-amber-600 dark:text-amber-400">
                <span>{extras.extraDiscountRow.label}</span>
                {extras.extraDiscountRow.amount !== null && (
                  <span className="tabular-nums font-semibold">
                    {formatEur(extras.extraDiscountRow.amount)}
                  </span>
                )}
              </div>
            )}
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

      <Card>
        <CardHeader>
          <CardTitle>Condizioni di fornitura</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {supplyConditions.map((line) => (
              <li key={line.label}>
                {line.value === null ? (
                  <span className="font-medium">{line.label}</span>
                ) : (
                  <>
                    <span className="font-medium">{line.label}:</span>{" "}
                    {line.value}
                  </>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
