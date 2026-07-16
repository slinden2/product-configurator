"use client";

import { Handshake } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MarginLineState } from "@/lib/margin-alerts";
import { MSG } from "@/lib/messages";
import { formatPct } from "@/lib/money";
import type {
  MarginOverviewRow,
  ProjectedMarginOverview,
  RenegotiationHubState,
} from "@/lib/offer-margin-hub";
import { cn } from "@/lib/utils";

// The view-model types live in the pure helper module (lib/offer-margin-hub);
// re-exported here so existing importers of this component keep working.
export type {
  MarginOverviewRow,
  ProjectedMarginOverview,
  RenegotiationHubState,
};

/** Which revision's margins the selector is currently showing. */
type MarginView = "accepted" | "projected";

interface Props {
  offerId: number;
  acceptedRevisionNo: number;
  rows: MarginOverviewRow[];
  /**
   * The working (renegotiation) revision's projected rows + metadata, or
   * null/undefined when no live renegotiation exists. When present, a selector
   * appears and defaults to the projection.
   */
  projected?: ProjectedMarginOverview | null;
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
 * Offer-level margin decision hub (#269): the single entry point for a revision's
 * per-line margin state and the absorb / renegotiate decisions. Pure/presentational
 * — the page computes and gates the data (canViewMarginReview), so unauthorized
 * roles never receive it.
 *
 * When `projected` is supplied (a live renegotiation exists), a revision selector
 * toggles between the in-force **accepted** rows and the **projected** rows of the
 * working renegotiation, defaulting to the projection — so a director tuning the
 * discount sees the resulting margin immediately. Absorb is an accepted-only
 * action: a DRAFT renegotiation line cannot be absorbed (the server rejects it),
 * so the absorb button is hidden in the projected view.
 */
export default function OfferMarginOverview({
  offerId,
  acceptedRevisionNo,
  rows,
  projected,
  renegotiation,
}: Props) {
  const [view, setView] = useState<MarginView>(
    projected ? "projected" : "accepted",
  );
  const showingProjected = view === "projected" && !!projected;
  const activeRows = showingProjected ? projected.rows : rows;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-2xl">
              {MSG.marginReview.overviewTitle}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {showingProjected
                ? MSG.marginReview.overviewSubtitleProjected(
                    projected.revisionNo,
                  )
                : MSG.marginReview.overviewSubtitle(acceptedRevisionNo)}
            </p>
          </div>
          {projected && (
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
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeRows.length === 0 ? (
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
              {activeRows.map((row) => (
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
                      {/* Absorb is an accepted-only decision: you cannot absorb a
                          projection (the DRAFT renegotiation line is not frozen and
                          the server rejects it), so it never shows in projected view. */}
                      {!showingProjected && decisionRequired(row.state) && (
                        <AbsorbMarginButton
                          lineId={row.lineId}
                          marginPct={row.marginPct ?? 0}
                          thresholdPct={row.thresholdPct}
                        />
                      )}
                      <Link
                        href={
                          projected
                            ? `/configurazioni/marginalita/${row.configId}?revision=${
                                showingProjected ? "working" : "accepted"
                              }`
                            : `/configurazioni/marginalita/${row.configId}`
                        }
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

        {showingProjected && (
          <p className="text-sm text-muted-foreground">
            {MSG.marginReview.projectedNote}
          </p>
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
