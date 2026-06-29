import { AlertTriangle, Lock } from "lucide-react";
import AlertBanner from "@/components/shared/alert-banner";
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
import { type MarginComparison, MIN_MARGIN_PCT } from "@/lib/margin";
import {
  cn,
  formatDateDDMMYYYYHHMM,
  formatDelta,
  formatEur,
  formatPct,
} from "@/lib/utils";

interface Props {
  comparison: MarginComparison;
  discountPct: number;
  /**
   * When set, the configuration was frozen as-sold at offer acceptance (the
   * at-acceptance as-sold snapshot). `null` for a config whose offer revision
   * has not been accepted yet.
   */
  asSoldFrozenAt?: Date | null;
}

/** Red when cost grew (delta > 0), green when it shrank. */
function deltaClass(delta: number): string {
  if (delta > 0) return "text-destructive";
  if (delta < 0) return "text-green-600 dark:text-green-400";
  return "text-muted-foreground";
}

function StatTile({
  label,
  value,
  valueClass,
  hint,
}: {
  label: string;
  value: string;
  valueClass?: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="text-sm font-medium text-muted-foreground mb-1">
        {label}
      </div>
      <div className={cn("text-2xl font-semibold tabular-nums", valueClass)}>
        {value}
      </div>
      {hint && (
        <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>
      )}
    </div>
  );
}

function SummaryCard({ comparison, discountPct }: Props) {
  const {
    hasEbom,
    offerMargin,
    currentMargin,
    marginPctDrop,
    costDelta,
    belowThreshold,
  } = comparison;

  // Color the post-engineering margin only once an EBOM exists; until then it
  // is a 0 placeholder and stays neutral.
  const currentMarginClass = !hasEbom
    ? undefined
    : belowThreshold
      ? "text-destructive"
      : "text-green-600 dark:text-green-400";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Riepilogo marginalità</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {belowThreshold && (
          <AlertBanner
            variant="error"
            icon={<AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
            title="Marginalità sotto la soglia minima"
          >
            La marginalità dopo la progettazione (
            {formatPct(currentMargin.marginPct)}) è inferiore alla soglia minima
            del {formatPct(MIN_MARGIN_PCT)}.
          </AlertBanner>
        )}

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile
            label="Prezzo offerta"
            value={formatEur(currentMargin.revenue)}
            hint={
              discountPct > 0 ? `sconto ${formatPct(discountPct)}` : undefined
            }
          />
          <StatTile label="Costo offerta" value={formatEur(offerMargin.cost)} />
          <StatTile
            label="Marginalità all'offerta"
            value={formatPct(offerMargin.marginPct)}
            hint={formatEur(offerMargin.marginValue)}
          />
          <StatTile
            label="Costo progettazione"
            value={formatEur(currentMargin.cost)}
          />
          <StatTile
            label="Marginalità dopo progettazione"
            value={formatPct(currentMargin.marginPct)}
            valueClass={currentMarginClass}
            hint={formatEur(currentMargin.marginValue)}
          />
        </div>

        {hasEbom && (
          <div className="flex flex-wrap gap-x-8 gap-y-2 border-t pt-4 text-sm">
            <div>
              <span className="text-muted-foreground">
                Variazione marginalità:{" "}
              </span>
              <span className={cn("font-semibold", deltaClass(marginPctDrop))}>
                {marginPctDrop > 0 ? "-" : marginPctDrop < 0 ? "+" : ""}
                {formatPct(Math.abs(marginPctDrop))}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Variazione costo: </span>
              <span className={cn("font-semibold", deltaClass(costDelta))}>
                {formatDelta(costDelta)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TagBreakdownCard({ comparison }: { comparison: MarginComparison }) {
  const { hasEbom, tagBreakdown, offerCost, ebomCost, costDelta } = comparison;
  // Without an EBOM there is nothing to compare against, so the variation is 0.
  const totalDelta = hasEbom ? costDelta : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          Variazione costi per categoria
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-auto py-1 px-0">Categoria</TableHead>
              <TableHead className="h-auto py-1 px-0 text-right">
                Costo offerta
              </TableHead>
              <TableHead className="h-auto py-1 px-0 text-right">
                Costo progettazione
              </TableHead>
              <TableHead className="h-auto py-1 pl-0 pr-4 text-right">
                Variazione
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tagBreakdown.map((row) => {
              const rowDelta = hasEbom ? row.delta : 0;
              return (
                <TableRow key={row.tag} className="border-0 hover:bg-muted/40">
                  <TableCell className="py-1.5 px-0">{row.label}</TableCell>
                  <TableCell className="py-1.5 px-0 text-right tabular-nums">
                    {formatEur(row.offerCost)}
                  </TableCell>
                  <TableCell className="py-1.5 px-0 text-right tabular-nums">
                    {formatEur(row.ebomCost)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "py-1.5 pl-0 pr-4 text-right tabular-nums font-medium",
                      deltaClass(rowDelta),
                    )}
                  >
                    {formatDelta(rowDelta)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter className="bg-transparent">
            <TableRow className="hover:bg-transparent">
              <TableCell className="py-2 px-0 font-medium text-muted-foreground">
                Totale
              </TableCell>
              <TableCell className="py-2 px-0 text-right font-semibold tabular-nums">
                {formatEur(offerCost)}
              </TableCell>
              <TableCell className="py-2 px-0 text-right font-semibold tabular-nums">
                {formatEur(ebomCost)}
              </TableCell>
              <TableCell
                className={cn(
                  "py-2 pl-0 pr-4 text-right font-semibold tabular-nums",
                  deltaClass(totalDelta),
                )}
              >
                {formatDelta(totalDelta)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function MarginReviewView({
  comparison,
  discountPct,
  asSoldFrozenAt,
}: Props) {
  return (
    <div className="space-y-6">
      {asSoldFrozenAt && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Lock className="h-4 w-4 shrink-0" />
          <span>
            Configurazione congelata come venduta il{" "}
            <span className="font-medium text-foreground">
              {formatDateDDMMYYYYHHMM(asSoldFrozenAt)}
            </span>
          </span>
        </div>
      )}
      <SummaryCard comparison={comparison} discountPct={discountPct} />
      <TagBreakdownCard comparison={comparison} />
    </div>
  );
}
