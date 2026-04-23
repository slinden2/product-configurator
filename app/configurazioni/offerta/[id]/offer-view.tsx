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
import { formatEur } from "@/lib/utils";
import type { OfferSnapshotItem } from "@/validation/offer-schema";
import DiscountInput from "./discount-input";

interface Props {
  data: GroupedOfferData & {
    total_list_price: number;
    discounted_total: number;
  };
  confId: number;
  discountPct: number;
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

function ItemRows({ items }: { items: OfferSnapshotItem[] }) {
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
}: {
  title: string;
  sections: GroupedOfferSection[];
  itemLabel: string;
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
            <SectionOfferTable section={section} />
          </BOMCard>
        ))}
      </CardContent>
    </Card>
  );
}

function SectionOfferTable({ section }: { section: GroupedOfferSection }) {
  return (
    <Table>
      <OfferTableHeader />
      <TableBody>
        <ItemRows items={section.items} />
      </TableBody>
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
    </Table>
  );
}

export default function OfferView({
  data,
  confId,
  discountPct,
  editable,
  stale,
}: Props) {
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
              </TableBody>
            ))}
          </Table>
        </BOMCard>
      )}

      <OfferSectionGroup
        title="Serbatoi"
        sections={data.waterTanks}
        itemLabel="Serbatoio"
      />
      <OfferSectionGroup
        title="Piste"
        sections={data.washBays}
        itemLabel="Pista"
      />

      {/* Riepilogo */}
      <Card>
        <CardHeader>
          <CardTitle>Riepilogo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editable && (
            <DiscountInput
              confId={confId}
              initialDiscount={discountPct}
              disabled={stale}
            />
          )}
          <div className="border-t pt-4 space-y-2">
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
                  -{formatEur(data.total_list_price - data.discounted_total)}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
