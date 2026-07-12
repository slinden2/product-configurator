import BOMCard from "@/components/bom-card";
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
import type { OfferBomLineItem } from "@/validation/offer/offer-pricing-schema";

/**
 * Shared presentational pieces for offer BOM breakdown tables, used by both the
 * per-config OfferView and the per-line LineBreakdown so column layout, labels, and
 * styling stay in one place.
 */

export function OfferTableHeader() {
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

export function ItemRows({ items }: { items: OfferBomLineItem[] }) {
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

export function SectionOfferTable({
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

/** The "Portale" general-BOM block, grouped by tag with per-group subtotals. */
export function GeneralBomTable({
  general,
  showPrices,
}: {
  general: GroupedOfferData["general"];
  showPrices: boolean;
}) {
  if (general.length === 0) return null;
  return (
    <BOMCard title="Portale">
      <Table>
        <OfferTableHeader />
        {general.map((group) => (
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
  );
}
