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

interface Props {
  data: GroupedOfferData & {
    total_list_price: number;
    discounted_total: number;
  };
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
        <TableRow
          key={item.pn}
          className="text-xs text-muted-foreground border-0 hover:bg-transparent"
        >
          <TableCell className="py-1 pl-4 pr-0">{item.pn}</TableCell>
          <TableCell className="py-1 pl-4 pr-0">{item.description}</TableCell>
          <TableCell className="py-1 pl-0 pr-4 text-right tabular-nums">
            {item.qty}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function SectionTable({
  title,
  sections,
  sectionLabel,
}: {
  title: string;
  sections: GroupedOfferSection[];
  sectionLabel: (index: number) => string;
}) {
  return (
    <>
      {sections.map((section) => (
        <section key={`${title}-${section.index}`}>
          <h2 className="text-lg font-semibold mb-3">
            {sectionLabel(section.index)}
          </h2>
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
        </section>
      ))}
    </>
  );
}

export default function OfferView({ data }: Props) {
  return (
    <div className="space-y-6">
      {data.general.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Macchina principale</h2>
          <Table>
            <OfferTableHeader />
            {data.general.map((group) => (
              <TableBody key={group.tag}>
                <TableRow className="border-t border-b-0 bg-muted/40 hover:bg-muted/40">
                  <TableCell
                    colSpan={3}
                    className="py-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {group.label}
                  </TableCell>
                </TableRow>
                <ItemRows items={group.items} />
                <TableRow className="border-b hover:bg-transparent">
                  <TableCell
                    colSpan={2}
                    className="py-1.5 px-0 text-right text-xs text-muted-foreground"
                  >
                    Subtotale {group.label}
                  </TableCell>
                  <TableCell className="py-1.5 pl-0 pr-4 text-right text-xs font-medium tabular-nums">
                    {formatEur(group.total)}
                  </TableCell>
                </TableRow>
              </TableBody>
            ))}
          </Table>
        </section>
      )}

      <SectionTable
        title="wt"
        sections={data.waterTanks}
        sectionLabel={(i) => `Serbatoio ${i + 1}`}
      />

      <SectionTable
        title="wb"
        sections={data.washBays}
        sectionLabel={(i) => `Pista ${i + 1}`}
      />

      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-base font-semibold">
          <span>Totale listino</span>
          <span className="tabular-nums">
            {formatEur(data.total_list_price)}
          </span>
        </div>
        {data.discounted_total !== data.total_list_price && (
          <div className="flex justify-between text-base font-semibold text-green-600 dark:text-green-400">
            <span>Totale scontato</span>
            <span className="tabular-nums">
              {formatEur(data.discounted_total)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
