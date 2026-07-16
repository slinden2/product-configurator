"use client";

import { AlertTriangle, Lock, ShieldCheck } from "lucide-react";
import { useState } from "react";
import Banner from "@/components/shared/banner";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  AsSoldDiff,
  AsSoldDiffStatus,
} from "@/lib/configuration/build-as-sold-diff";
import type { LineDiffRow, MarginComparison } from "@/lib/margin";
import { MSG } from "@/lib/messages";
import { formatDelta, formatPct } from "@/lib/money";
import { cn, formatDateDDMMYYYYHHMM, formatEur } from "@/lib/utils";

/** Which revision's margins the selector is currently showing. */
type MarginView = "accepted" | "projected";

interface Props {
  comparison: MarginComparison;
  discountPct: number;
  /**
   * When set, the configuration was frozen as-sold at offer acceptance (the
   * at-acceptance as-sold snapshot). `null` for a config whose offer revision
   * has not been accepted yet.
   */
  asSoldFrozenAt?: Date | null;
  /** Field-level drift vs the as-sold snapshot; null when no freeze exists. */
  asSoldDiff?: AsSoldDiff | null;
  /** True when a freeze exists but the snapshot could not be compared. */
  asSoldDiffUnavailable?: boolean;
  /**
   * Recorded absorb sign-off (#84), shown read-only; null when the line is not
   * eligible (no accepted/frozen offer line) or was never absorbed. The absorb
   * decision itself is taken on the offer margin hub, not on this page.
   */
  absorb?: {
    signOff: {
      byLabel: string;
      at: Date;
      marginPct: number;
      note: string | null;
    } | null;
  } | null;
  /**
   * The working (renegotiation) revision's projected view, or null when no live
   * renegotiation exists. When present a revision selector appears and defaults
   * to the projection (unless `initialView` overrides). The projected comparison
   * uses the working line's live pricing vs the same live EBOM cost; it has no
   * as-sold freeze, so its analog of the as-sold diff is the accepted→projected
   * before/after card.
   */
  projected?: {
    revisionNo: number;
    statusLabel: string;
    comparison: MarginComparison;
    discountPct: number;
  } | null;
  /** Initial selector value (from the hub's ?revision link); defaults to projected. */
  initialView?: MarginView;
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

function SummaryCard({ comparison, discountPct, absorb }: Props) {
  const {
    hasEbom,
    offerMargin,
    currentMargin,
    marginPctDrop,
    costDelta,
    thresholdPct,
    belowThreshold,
    alertActive,
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
        {alertActive && (
          <Banner
            variant="error"
            icon={<AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
            title="Marginalità sotto la soglia minima"
          >
            La marginalità dopo la progettazione (
            {formatPct(currentMargin.marginPct)}) è inferiore alla soglia minima
            del {formatPct(thresholdPct)}. La decisione (assorbimento o
            rinegoziazione) si gestisce dalla pagina dell&apos;offerta.
          </Banner>
        )}

        {absorb?.signOff && (
          <Banner
            icon={<ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />}
            title={MSG.marginReview.signOffTitle}
          >
            {MSG.marginReview.signOffBody(
              absorb.signOff.byLabel,
              formatDateDDMMYYYYHHMM(absorb.signOff.at),
              formatPct(absorb.signOff.marginPct),
            )}
            {absorb.signOff.note && (
              <span className="block mt-1">
                {MSG.marginReview.signOffNoteLabel}: {absorb.signOff.note}
              </span>
            )}
          </Banner>
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

const DIFF_STATUS_BADGES: Record<
  AsSoldDiffStatus,
  { label: string; className: string }
> = {
  changed: {
    label: "Modificato",
    className: "text-amber-600 border-amber-600 dark:text-amber-400",
  },
  added: {
    label: "Aggiunto",
    className: "text-green-600 border-green-600 dark:text-green-400",
  },
  removed: {
    label: "Rimosso",
    className: "text-destructive border-destructive",
  },
};

function AsSoldDiffCard({
  diff,
  unavailable,
}: {
  diff: AsSoldDiff | null;
  unavailable: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          {MSG.marginReview.asSoldDiffTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {unavailable || !diff ? (
          <p className="text-sm text-muted-foreground">
            {MSG.marginReview.asSoldDiffUnavailable}
          </p>
        ) : !diff.hasChanges ? (
          <p className="text-sm text-muted-foreground">
            {MSG.marginReview.asSoldNoChanges}
          </p>
        ) : (
          <Table className="table-fixed min-w-[640px]">
            <colgroup>
              <col className="w-[34%]" />
              <col className="w-[22%]" />
              <col className="w-[22%]" />
              <col className="w-[22%]" />
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-auto py-1 px-0">Campo</TableHead>
                <TableHead className="h-auto py-1 px-0">Venduto</TableHead>
                <TableHead className="h-auto py-1 px-0">Attuale</TableHead>
                <TableHead className="h-auto py-1 pl-0 pr-4 text-right">
                  Stato
                </TableHead>
              </TableRow>
            </TableHeader>
            {diff.sections.map((section) => (
              <TableBody key={section.title}>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableCell
                    colSpan={4}
                    className="pt-5 pb-1 px-0 text-sm font-medium text-muted-foreground"
                  >
                    {section.title}
                  </TableCell>
                </TableRow>
                {section.rows.map((row) => {
                  const badge = DIFF_STATUS_BADGES[row.status];
                  return (
                    <TableRow
                      key={`${section.title}:${row.key}`}
                      className="border-0 hover:bg-muted/40"
                    >
                      <TableCell className="py-1.5 px-0">{row.label}</TableCell>
                      <TableCell className="py-1.5 px-0 text-muted-foreground">
                        {row.asSoldValue ?? "—"}
                      </TableCell>
                      <TableCell className="py-1.5 px-0 font-medium">
                        {row.currentValue ?? "—"}
                      </TableCell>
                      <TableCell className="py-1.5 pl-0 pr-4 text-right">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", badge.className)}
                        >
                          {badge.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            ))}
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

type LineDiffBadgeKind = "added" | "removed" | "qty" | "cost";

const LINE_DIFF_BADGES: Record<
  LineDiffBadgeKind,
  { label: string; className: string }
> = {
  added: {
    label: "Aggiunto",
    className: "text-green-600 border-green-600 dark:text-green-400",
  },
  removed: {
    label: "Rimosso",
    className: "text-destructive border-destructive",
  },
  qty: {
    label: "Q.tà modificata",
    className: "text-amber-600 border-amber-600 dark:text-amber-400",
  },
  cost: {
    label: "Costo aggiornato",
    className: "text-sky-600 border-sky-600 dark:text-sky-400",
  },
};

/** A qty change means engineering changed the machine; a pure cost change means the catalog price moved. */
function lineDiffBadgeKind(row: LineDiffRow): LineDiffBadgeKind {
  if (row.status === "added" || row.status === "removed") return row.status;
  return row.qtyChanged ? "qty" : "cost";
}

function LineDiffCard({
  lineDiff,
  frozen,
}: {
  lineDiff: LineDiffRow[];
  frozen: boolean;
}) {
  const rows = lineDiff.filter((row) => row.status !== "unchanged");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          {frozen
            ? MSG.marginReview.lineDiffTitleFrozen
            : MSG.marginReview.lineDiffTitleQuote}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {frozen
              ? MSG.marginReview.lineDiffNoChangesFrozen
              : MSG.marginReview.lineDiffNoChangesQuote}
          </p>
        ) : (
          <Table className="table-fixed min-w-[880px]">
            <colgroup>
              <col className="w-[14%]" />
              <col className="w-[23%]" />
              <col className="w-[10%]" />
              <col className="w-[13%]" />
              <col className="w-[14%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-auto py-1 px-0">Codice</TableHead>
                <TableHead className="h-auto py-1 px-0">Descrizione</TableHead>
                <TableHead className="h-auto py-1 px-0 text-right">
                  Q.tà
                </TableHead>
                <TableHead className="h-auto py-1 px-0 text-right">
                  Costo offerta
                </TableHead>
                <TableHead className="h-auto py-1 px-0 text-right">
                  Costo progettazione
                </TableHead>
                <TableHead className="h-auto py-1 px-0 text-right">
                  Variazione
                </TableHead>
                <TableHead className="h-auto py-1 pl-0 pr-4 text-right">
                  Stato
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const badge = LINE_DIFF_BADGES[lineDiffBadgeKind(row)];
                return (
                  <TableRow key={row.pn} className="border-0 hover:bg-muted/40">
                    <TableCell className="py-1.5 px-0">{row.pn}</TableCell>
                    <TableCell className="py-1.5 px-0 truncate">
                      {row.description}
                    </TableCell>
                    <TableCell className="py-1.5 px-0 text-right tabular-nums">
                      {row.qtyChanged ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          {row.offerQty ?? "—"} → {row.ebomQty ?? "—"}
                        </span>
                      ) : (
                        (row.ebomQty ?? row.offerQty ?? "—")
                      )}
                    </TableCell>
                    <TableCell className="py-1.5 px-0 text-right tabular-nums">
                      {formatEur(row.offerCost)}
                    </TableCell>
                    <TableCell className="py-1.5 px-0 text-right tabular-nums">
                      {formatEur(row.ebomCost)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "py-1.5 px-0 text-right tabular-nums font-medium",
                        deltaClass(row.costDelta),
                      )}
                    >
                      {formatDelta(row.costDelta)}
                    </TableCell>
                    <TableCell className="py-1.5 pl-0 pr-4 text-right whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={cn(
                          "whitespace-nowrap text-[10px]",
                          badge.className,
                        )}
                      >
                        {badge.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/** Green when the value moved the margin-favorable way (up), red when down. */
function gainClass(delta: number): string {
  if (delta > 0) return "text-green-600 dark:text-green-400";
  if (delta < 0) return "text-destructive";
  return "text-muted-foreground";
}

/** Signed percentage-point label: 6.8 → "+6,8%", -3.2 → "-3,2%". */
function formatPctDelta(delta: number): string {
  const sign = delta > 0 ? "+" : delta < 0 ? "-" : "";
  return `${sign}${formatPct(Math.abs(delta))}`;
}

/**
 * Before/after of the accepted line vs the projected renegotiation line. The
 * engineering cost is identical on both sides (same live EBOM), so only the price
 * — and therefore the post-engineering margin — moves: exactly the lever the
 * director is tuning. This is the projected view's analog of the as-sold diff,
 * which is vacuous for a draft line that references the current config.
 */
function AcceptedVsProjectedCard({
  accepted,
  projected,
}: {
  accepted: MarginComparison;
  projected: MarginComparison;
}) {
  const acceptedRevenue = accepted.currentMargin.revenue;
  const projectedRevenue = projected.currentMargin.revenue;
  const priceDelta = projectedRevenue - acceptedRevenue;

  const acceptedMarginPct = accepted.currentMargin.marginPct;
  const projectedMarginPct = projected.currentMargin.marginPct;
  const marginDelta = projectedMarginPct - acceptedMarginPct;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          Confronto: accettato → proiezione
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-auto py-1 px-0">Metrica</TableHead>
              <TableHead className="h-auto py-1 px-0 text-right">
                Accettato
              </TableHead>
              <TableHead className="h-auto py-1 px-0 text-right">
                Proiezione
              </TableHead>
              <TableHead className="h-auto py-1 pl-0 pr-4 text-right">
                Variazione
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="border-0 hover:bg-muted/40">
              <TableCell className="py-1.5 px-0">Prezzo offerta</TableCell>
              <TableCell className="py-1.5 px-0 text-right tabular-nums">
                {formatEur(acceptedRevenue)}
              </TableCell>
              <TableCell className="py-1.5 px-0 text-right tabular-nums font-medium">
                {formatEur(projectedRevenue)}
              </TableCell>
              <TableCell
                className={cn(
                  "py-1.5 pl-0 pr-4 text-right tabular-nums font-medium",
                  gainClass(priceDelta),
                )}
              >
                {formatDelta(priceDelta)}
              </TableCell>
            </TableRow>
            <TableRow className="border-0 hover:bg-muted/40">
              <TableCell className="py-1.5 px-0">
                Marginalità dopo progettazione
              </TableCell>
              <TableCell className="py-1.5 px-0 text-right tabular-nums">
                {formatPct(acceptedMarginPct)}
              </TableCell>
              <TableCell
                className={cn(
                  "py-1.5 px-0 text-right tabular-nums font-semibold",
                  projected.belowThreshold
                    ? "text-destructive"
                    : "text-green-600 dark:text-green-400",
                )}
              >
                {formatPct(projectedMarginPct)}
              </TableCell>
              <TableCell
                className={cn(
                  "py-1.5 pl-0 pr-4 text-right tabular-nums font-medium",
                  gainClass(marginDelta),
                )}
              >
                {formatPctDelta(marginDelta)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <p className="text-sm text-muted-foreground">
          {projected.belowThreshold
            ? `La marginalità proiettata resta sotto la soglia minima del ${formatPct(projected.thresholdPct)}: riduci ancora lo sconto della rinegoziazione.`
            : `La marginalità proiettata supera la soglia minima del ${formatPct(projected.thresholdPct)}.`}{" "}
          Il costo di progettazione è invariato: la rinegoziazione agisce solo
          sul prezzo.
        </p>
      </CardContent>
    </Card>
  );
}

export default function MarginReviewView({
  comparison,
  discountPct,
  asSoldFrozenAt,
  asSoldDiff = null,
  asSoldDiffUnavailable = false,
  absorb = null,
  projected = null,
  initialView,
}: Props) {
  const [view, setView] = useState<MarginView>(
    projected ? (initialView ?? "projected") : "accepted",
  );
  const showingProjected = view === "projected" && !!projected;

  const activeComparison = showingProjected ? projected.comparison : comparison;
  const activeDiscount = showingProjected ? projected.discountPct : discountPct;

  return (
    <div className="space-y-6">
      {projected && (
        <div className="flex justify-end">
          <Tabs
            value={view}
            onValueChange={(value) => setView(value as MarginView)}
          >
            <TabsList>
              <TabsTrigger value="projected">
                {MSG.marginReview.selectorProjected}
              </TabsTrigger>
              <TabsTrigger value="accepted">
                {MSG.marginReview.selectorAccepted}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {showingProjected ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <span className="font-medium">
              Proiezione rinegoziazione (rev. {projected.revisionNo} —{" "}
              {projected.statusLabel})
            </span>
            : i valori riflettono lo sconto in lavorazione e non sono ancora in
            vigore. La revisione accettata resta valida finché la rinegoziazione
            non viene accettata.
          </span>
        </div>
      ) : (
        asSoldFrozenAt && (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4 shrink-0" />
            <span>
              Configurazione congelata come venduta il{" "}
              <span className="font-medium text-foreground">
                {formatDateDDMMYYYYHHMM(asSoldFrozenAt)}
              </span>
            </span>
          </div>
        )
      )}

      <SummaryCard
        comparison={activeComparison}
        discountPct={activeDiscount}
        absorb={showingProjected ? null : absorb}
      />

      {showingProjected ? (
        <AcceptedVsProjectedCard
          accepted={comparison}
          projected={projected.comparison}
        />
      ) : (
        asSoldFrozenAt && (
          <AsSoldDiffCard
            diff={asSoldDiff}
            unavailable={asSoldDiffUnavailable}
          />
        )
      )}

      {activeComparison.hasEbom && (
        <LineDiffCard
          lineDiff={activeComparison.lineDiff}
          frozen={!showingProjected && !!asSoldFrozenAt}
        />
      )}
      <TagBreakdownCard comparison={activeComparison} />
    </div>
  );
}
