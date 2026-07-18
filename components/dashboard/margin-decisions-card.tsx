import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MarginSweepLine, UserData } from "@/db/queries";
import { getAcceptedOfferLinesForMarginSweep } from "@/db/queries";
import { canViewMarginReview } from "@/lib/access";
import {
  classifyMarginLineState,
  computeLineMarginAlertsBatch,
} from "@/lib/margin-alerts";

// The dashboard card is a triage surface, not the full review: show the worst
// offenders and defer the rest to the per-config margin pages.
const MAX_VISIBLE_ROWS = 8;

interface ActionableAlert {
  lineId: number;
  configurationId: number;
  offerId: number;
  offerNumber: string;
  position: number;
  marginPct: number;
  thresholdPct: number;
  state: "BELOW_THRESHOLD" | "ABSORBED_ERODED";
}

interface MarginDecisionsCardProps {
  user: NonNullable<UserData>;
}

export async function MarginDecisionsCard({ user }: MarginDecisionsCardProps) {
  if (!canViewMarginReview(user.role)) return null;

  const sweepLines = await getAcceptedOfferLinesForMarginSweep(user);

  // The batch computes per revision (one discount each) — group the flat rows
  // by offer: post-acceptance an offer has exactly one in-force revision.
  const byOffer = new Map<
    number,
    { discountPct: number; lines: MarginSweepLine[] }
  >();
  for (const line of sweepLines) {
    const group = byOffer.get(line.offerId) ?? {
      discountPct: line.discountPct,
      lines: [],
    };
    group.lines.push(line);
    byOffer.set(line.offerId, group);
  }

  const alerts = await computeLineMarginAlertsBatch([...byOffer.values()]);

  const actionable: ActionableAlert[] = [];
  for (const line of sweepLines) {
    const alert = alerts.get(line.id);
    const state = classifyMarginLineState(alert);
    if (state !== "BELOW_THRESHOLD" && state !== "ABSORBED_ERODED") continue;
    if (!alert) continue;
    actionable.push({
      lineId: line.id,
      configurationId: line.configuration_id,
      offerId: line.offerId,
      offerNumber: line.offerNumber,
      position: line.position,
      marginPct: alert.marginPct,
      thresholdPct: alert.thresholdPct,
      state,
    });
  }
  // Worst margin deficit first, so the rows above the cap are the ones that
  // most need a decision.
  actionable.sort(
    (a, b) => b.thresholdPct - b.marginPct - (a.thresholdPct - a.marginPct),
  );
  const visible = actionable.slice(0, MAX_VISIBLE_ROWS);
  const overflowCount = actionable.length - visible.length;

  const emptyMessage =
    sweepLines.length === 0
      ? "Nessuna offerta accettata da analizzare."
      : "Nessuna decisione margine richiesta.";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        {actionable.length > 0 && (
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        )}
        <CardTitle className="text-sm font-medium">
          Decisioni margine
          {actionable.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {actionable.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {actionable.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="space-y-2">
            {visible.map((a) => (
              <div
                key={a.lineId}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Link
                    href={`/offerte/${a.offerId}`}
                    className="font-medium hover:underline shrink-0"
                  >
                    {a.offerNumber}
                  </Link>
                  <span className="text-muted-foreground">
                    riga {a.position + 1}
                  </span>
                  <Badge
                    variant={
                      a.state === "ABSORBED_ERODED" ? "destructive" : "outline"
                    }
                    className="text-xs"
                  >
                    {a.state === "ABSORBED_ERODED"
                      ? "Margine eroso"
                      : "Sotto soglia"}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="tabular-nums text-muted-foreground">
                    {a.marginPct.toFixed(1)}% / {a.thresholdPct}%
                  </span>
                  <Link
                    href={`/configurazioni/marginalita/${a.configurationId}`}
                    className="text-primary hover:underline text-xs"
                    aria-label={`Analizza margine ${a.offerNumber} riga ${a.position + 1}`}
                  >
                    Analizza
                  </Link>
                </div>
              </div>
            ))}
            {overflowCount > 0 && (
              <p className="text-xs text-muted-foreground">
                …e{" "}
                {overflowCount === 1
                  ? "un'altra riga"
                  : `altre ${overflowCount} righe`}{" "}
                da valutare
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
