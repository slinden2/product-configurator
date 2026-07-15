import { Handshake } from "lucide-react";
import Link from "next/link";
import AbsorbMarginButton from "@/components/offer/absorb-margin-button";
import RenegotiateRevisionButton from "@/components/offer/renegotiate-revision-button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MarginLineState } from "@/lib/margin-alerts";
import { MSG } from "@/lib/messages";
import { formatPct } from "@/lib/money";
import type {
  MarginOverviewRow,
  RenegotiationHubState,
} from "@/lib/offer-margin-hub";
import { cn } from "@/lib/utils";

// The view-model types live in the pure helper module (lib/offer-margin-hub);
// re-exported here so existing importers of this component keep working.
export type { MarginOverviewRow, RenegotiationHubState };

interface Props {
  offerId: number;
  acceptedRevisionNo: number;
  rows: MarginOverviewRow[];
  renegotiation: RenegotiationHubState;
}

const STATE_LABEL: Record<MarginLineState, string> = {
  ABOVE_THRESHOLD: MSG.marginReview.state.aboveThreshold,
  BELOW_THRESHOLD: MSG.marginReview.state.belowThreshold,
  ABSORBED: MSG.marginReview.state.absorbed,
  ABSORBED_ERODED: MSG.marginReview.state.absorbedEroded,
  MARGIN_UNAVAILABLE: MSG.marginReview.state.unavailable,
};

const STATE_VARIANT: Record<MarginLineState, BadgeProps["variant"]> = {
  ABOVE_THRESHOLD: "secondary",
  BELOW_THRESHOLD: "destructive",
  ABSORBED: "secondary",
  ABSORBED_ERODED: "destructive",
  MARGIN_UNAVAILABLE: "outline",
};

/** The two states that still need a management decision (absorb / renegotiate). */
function decisionRequired(state: MarginLineState): boolean {
  return state === "BELOW_THRESHOLD" || state === "ABSORBED_ERODED";
}

/**
 * Offer-level margin decision hub (#269): the single entry point for the
 * accepted revision's per-line margin state and the absorb / renegotiate
 * decisions. Pure/presentational — the page computes and gates the data
 * (canViewMarginReview), so unauthorized roles never receive it.
 */
export default function OfferMarginOverview({
  offerId,
  acceptedRevisionNo,
  rows,
  renegotiation,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          {MSG.marginReview.overviewTitle}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {MSG.marginReview.overviewSubtitle(acceptedRevisionNo)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {MSG.marginReview.overviewEmpty}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{MSG.marginReview.colConfiguration}</TableHead>
                <TableHead>{MSG.marginReview.colState}</TableHead>
                <TableHead className="text-right">
                  {MSG.marginReview.colMargin}
                </TableHead>
                <TableHead className="sr-only">
                  {MSG.marginReview.colActions}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.lineId}>
                  <TableCell className="font-medium">
                    {MSG.marginReview.lineLabel(row.position + 1)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATE_VARIANT[row.state]}>
                      {STATE_LABEL[row.state]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.marginPct === null ? "—" : formatPct(row.marginPct)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {decisionRequired(row.state) && (
                        <AbsorbMarginButton
                          lineId={row.lineId}
                          marginPct={row.marginPct ?? 0}
                          thresholdPct={row.thresholdPct}
                        />
                      )}
                      <Link
                        href={`/configurazioni/marginalita/${row.configId}`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                        )}
                      >
                        {MSG.marginReview.analyzeLink}
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {renegotiation.kind === "available" && (
          <div className="flex justify-end">
            <RenegotiateRevisionButton offerId={offerId} />
          </div>
        )}
        {renegotiation.kind === "open" && (
          <div className="flex items-center justify-end gap-1.5 text-sm text-muted-foreground">
            <Handshake className="h-4 w-4 shrink-0" />
            {MSG.marginReview.renegotiationOpenDetail(
              renegotiation.revisionNo,
              renegotiation.statusLabel,
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
