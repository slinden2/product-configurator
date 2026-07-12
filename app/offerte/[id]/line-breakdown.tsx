import BOMCard from "@/components/bom-card";
import {
  GeneralBomTable,
  SectionOfferTable,
} from "@/components/offer/offer-bom-tables";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GroupedOfferData, GroupedOfferSection } from "@/lib/offer";
import { formatEur } from "@/lib/utils";
import type { OfferSurchargeItem } from "@/validation/offer/offer-pricing-schema";

/**
 * Presentational grouped BOM breakdown for a single offer line (one
 * configuration). Mirrors the per-config OfferView tables (shared via
 * offer-bom-tables) but carries no summary or settings — the offer-level riepilogo
 * and controls live once on the quote view.
 */

interface Props {
  title: string;
  data: GroupedOfferData;
  surcharges: OfferSurchargeItem[];
  showPrices: boolean;
  quantity: number;
  /** Authoritative stored per-unit list price; the line total uses this (not the
   * unrounded snapshot sum) so the cards reconcile with the quote Riepilogo. */
  unitListPrice: number;
}

function OfferSectionGroup({
  title,
  sections,
  itemLabel,
  showPrices,
}: {
  title: string;
  sections: GroupedOfferSection[];
  itemLabel: string;
  showPrices: boolean;
}) {
  if (sections.length === 0) return null;
  return (
    <div className="space-y-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title} (n. {sections.length})
      </p>
      {sections.map((section) => (
        <BOMCard
          key={section.index}
          title={`${itemLabel} ${section.index + 1}`}
        >
          <SectionOfferTable section={section} showPrices={showPrices} />
        </BOMCard>
      ))}
    </div>
  );
}

function SurchargesBlock({
  surcharges,
  showPrices,
}: {
  surcharges: OfferSurchargeItem[];
  showPrices: boolean;
}) {
  if (surcharges.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Maggiorazioni
      </p>
      {surcharges.map((item) => (
        <div key={item.surcharge_kind} className="flex justify-between text-sm">
          <span>{item.description}</span>
          {showPrices && (
            <span className="tabular-nums font-semibold">
              {formatEur(item.amount)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function LineBreakdown({
  title,
  data,
  surcharges,
  showPrices,
  quantity,
  unitListPrice,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline justify-between gap-2">
          <span>{title}</span>
          <span className="text-sm font-normal text-muted-foreground">
            Qtà {quantity}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <GeneralBomTable general={data.general} showPrices={showPrices} />

        <OfferSectionGroup
          title="Serbatoi"
          sections={data.waterTanks}
          itemLabel="Serbatoio"
          showPrices={showPrices}
        />
        <OfferSectionGroup
          title="Piste"
          sections={data.washBays}
          itemLabel="Pista"
          showPrices={showPrices}
        />

        <SurchargesBlock surcharges={surcharges} showPrices={showPrices} />

        {showPrices && (
          <div className="flex justify-between border-t pt-3 text-base font-semibold">
            <span>Totale listino riga</span>
            <span className="tabular-nums">
              {formatEur(unitListPrice * quantity)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
