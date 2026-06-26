import {
  setOfferDiscountAction,
  setOfferSettingsAction,
} from "@/app/actions/offer-actions";
import BOMCard from "@/components/bom-card";
import {
  GeneralBomTable,
  SectionOfferTable,
} from "@/components/offer/offer-bom-tables";
import OfferSettingsCard from "@/components/offer/offer-settings-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GroupedOfferData, GroupedOfferSection } from "@/lib/offer";
import type { OfferSnapshotSettings } from "@/lib/offer-settings";
import { computeOfferSummaryExtras } from "@/lib/offer-settings";
import { formatEur } from "@/lib/utils";
import type { OfferSurchargeItem } from "@/validation/offer-schema";

interface Props {
  data: GroupedOfferData & {
    total_list_price: number;
    discounted_total: number;
  };
  surcharges: OfferSurchargeItem[];
  confId: number;
  discountPct: number;
  settings: OfferSnapshotSettings;
  editable: boolean;
  stale: boolean;
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
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          {title} (n. {sections.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {sections.map((section) => (
          <BOMCard
            key={section.index}
            title={`${itemLabel} ${section.index + 1}`}
          >
            <SectionOfferTable section={section} showPrices={showPrices} />
          </BOMCard>
        ))}
      </CardContent>
    </Card>
  );
}

function SurchargesCard({
  surcharges,
  showPrices,
}: {
  surcharges: OfferSurchargeItem[];
  showPrices: boolean;
}) {
  if (surcharges.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Maggiorazioni</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {surcharges.map((item) => (
            <div
              key={item.surcharge_kind}
              className="flex justify-between text-sm"
            >
              <span>{item.description}</span>
              {showPrices && (
                <span className="tabular-nums font-semibold">
                  {formatEur(item.amount)}
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function OfferView({
  data,
  surcharges,
  confId,
  discountPct,
  settings,
  editable,
  stale,
}: Props) {
  const showPrices = !settings.show_net_total_only;
  const extras = computeOfferSummaryExtras(settings, data.discounted_total);

  return (
    <div className="space-y-6">
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

      <SurchargesCard surcharges={surcharges} showPrices={showPrices} />

      {editable && (
        <OfferSettingsCard
          initialDiscount={discountPct}
          initialSettings={settings}
          disabled={stale}
          onSaveDiscount={setOfferDiscountAction.bind(null, confId)}
          onSaveSettings={setOfferSettingsAction.bind(null, confId)}
        />
      )}

      {/* Riepilogo */}
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
                    {formatEur(data.total_list_price)}
                  </span>
                </div>
                {discountPct > 0 && (
                  <div className="flex justify-between text-sm text-amber-600 dark:text-amber-400">
                    <span>Sconto {discountPct}%</span>
                    <span className="tabular-nums">
                      -
                      {formatEur(data.total_list_price - data.discounted_total)}
                    </span>
                  </div>
                )}
                {data.discounted_total !== data.total_list_price && (
                  <div className="flex justify-between text-base font-bold text-green-600 dark:text-green-400">
                    <span>Totale scontato</span>
                    <span className="tabular-nums">
                      {formatEur(data.discounted_total)}
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
