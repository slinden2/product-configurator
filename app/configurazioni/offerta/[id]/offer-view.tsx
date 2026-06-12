import BOMCard from "@/components/bom-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GroupedOfferData, GroupedOfferSection } from "@/lib/offer";
import type { OfferSnapshotSettings } from "@/lib/offer-settings";
import { computeOfferSummaryExtras } from "@/lib/offer-settings";
import { formatEur } from "@/lib/utils";
import type {
  OfferBomLineItem,
  OfferSurchargeItem,
} from "@/validation/offer-schema";
import OfferSettingsCard from "./offer-settings-card";

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

function OfferTableHeader() {
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="h-auto py-1 px-0">Codice</TableHead>
        <TableHead className="h-auto py-1 pl-4 pr-0">Descrizione</TableHead>
        <TableHead className="h-auto py-1 pl-0 pr-4 text-right">Qtà</TableHead>
      </TableRow>
    </TableHeader>
  );
}

function ItemRows({ items }: { items: OfferBomLineItem[] }) {
  return (
    <>
      {items.map((item) => (
        <TableRow key={item.pn} className="border-0 hover:bg-muted/40">
          <TableCell className="py-1.5 pl-4 pr-0 font-mono text-sm">
            {item.pn}
          </TableCell>
          <TableCell className="py-1.5 pl-4 pr-0 font-mono text-sm">
            {item.description}
          </TableCell>
          <TableCell className="py-1.5 pl-0 pr-4 text-right tabular-nums">
            {item.qty}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
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

function SectionOfferTable({
  section,
  showPrices,
}: {
  section: GroupedOfferSection;
  showPrices: boolean;
}) {
  return (
    <Table>
      <OfferTableHeader />
      <TableBody>
        <ItemRows items={section.items} />
      </TableBody>
      {showPrices && (
        <TableFooter className="bg-transparent">
          <TableRow className="hover:bg-transparent">
            <TableCell
              colSpan={2}
              className="py-2 px-0 text-muted-foreground font-medium"
            >
              Totale
            </TableCell>
            <TableCell className="py-2 pl-0 pr-4 text-right font-semibold tabular-nums">
              {formatEur(section.total)}
            </TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
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
      {/* Gantry */}
      {data.general.length > 0 && (
        <BOMCard title="Portale">
          <Table>
            <OfferTableHeader />
            {data.general.map((group) => (
              <TableBody key={group.tag}>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableCell
                    colSpan={3}
                    className="py-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {group.label}
                  </TableCell>
                </TableRow>
                <ItemRows items={group.items} />
                {showPrices && (
                  <TableRow className="border-b hover:bg-transparent">
                    <TableCell
                      colSpan={2}
                      className="py-2 px-0 text-right text-sm text-muted-foreground font-medium"
                    >
                      Subtotale {group.label}
                    </TableCell>
                    <TableCell className="py-2 pl-0 pr-4 text-right font-semibold tabular-nums">
                      {formatEur(group.total)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            ))}
          </Table>
        </BOMCard>
      )}

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
          confId={confId}
          initialDiscount={discountPct}
          initialSettings={settings}
          disabled={stale}
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
