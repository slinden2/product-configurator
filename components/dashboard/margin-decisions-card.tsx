import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserData } from "@/db/queries";
import { getAcceptedOfferLinesForMarginSweep } from "@/db/queries";
import { canViewMarginReview } from "@/lib/access";
import {
  classifyMarginLineState,
  computeLineMarginAlertsBatch,
} from "@/lib/margin-alerts";

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

  const sweepOffers = await getAcceptedOfferLinesForMarginSweep(user);
  if (sweepOffers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Decisioni margine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nessuna offerta accettata da analizzare.
          </p>
        </CardContent>
      </Card>
    );
  }

  const alerts = await computeLineMarginAlertsBatch(
    sweepOffers.map((o) => ({ lines: o.lines, discountPct: o.discountPct })),
  );

  const lineToOffer = new Map<
    number,
    { offerId: number; offerNumber: string; position: number }
  >();
  for (const offer of sweepOffers) {
    for (const line of offer.lines) {
      lineToOffer.set(line.id, {
        offerId: offer.offerId,
        offerNumber: offer.offerNumber,
        position: line.position,
      });
    }
  }

  const actionable: ActionableAlert[] = [];
  for (const [lineId, alert] of alerts) {
    const state = classifyMarginLineState(alert);
    if (state !== "BELOW_THRESHOLD" && state !== "ABSORBED_ERODED") continue;
    const offerInfo = lineToOffer.get(lineId);
    if (!offerInfo) continue;
    actionable.push({
      lineId,
      configurationId: alert.configurationId,
      offerId: offerInfo.offerId,
      offerNumber: offerInfo.offerNumber,
      position: offerInfo.position,
      marginPct: alert.marginPct,
      thresholdPct: alert.thresholdPct,
      state,
    });
  }

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
          <p className="text-sm text-muted-foreground">
            Nessuna decisione margine richiesta.
          </p>
        ) : (
          <div className="space-y-2">
            {actionable.map((a) => (
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
                    riga {a.position}
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
                  >
                    Analizza
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
