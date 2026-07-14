import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { OfferWithRevisionAndLines } from "@/db/queries";
import { canExportOfferRevision } from "@/lib/access";
import { MSG } from "@/lib/messages";
import { buildOfferRevisionExportData } from "@/lib/offer-export";
import { isRenegotiationRevision } from "@/lib/offer-renegotiation";
import { formatDateDDMMYYYYHHMM } from "@/lib/utils";
import { OfferStatusLabels } from "@/types";
import CreateRevisionButton from "./create-revision-button";
import OfferExportButtons from "./export-offer-buttons";
import QuoteView from "./quote-view";

interface RevisionHistoryProps {
  /** Offer header, for building each revision's export payload; also carries
   * the revisions (newest-first; `revisions[0]` is the working one). */
  offer: OfferWithRevisionAndLines;
  /** True when a new revision can be created (the working revision is frozen, so no
   * open draft exists). Gates the per-revision "revert" buttons. */
  canCreateRevision: boolean;
  /** Initials of the viewing user, credited as author on exported documents. */
  exporterInitials: string;
  /** `revision_no` of the first-accepted revision (see `lib/offer-renegotiation`);
   * every later revision is marked as a renegotiation. */
  firstAcceptedNo: number | null;
}

/**
 * Inline, collapsible history of the offer's past (non-working) revisions. Each row
 * expands to its read-only quote and, when allowed, a button to clone-forward a new
 * revision from it ("revert"). Renders nothing when there is no history yet.
 */
const RevisionHistory = ({
  offer,
  canCreateRevision,
  exporterInitials,
  firstAcceptedNo,
}: RevisionHistoryProps) => {
  // The in-force accepted revision id: a past ACCEPTED revision that is no longer
  // pointed at has been superseded by an accepted renegotiation.
  const acceptedRevisionId = offer.accepted_revision_id;
  // revisions[0] is the working revision, shown at the top of the page; everything
  // after it is immutable history.
  const past = offer.revisions.slice(1);
  if (past.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Storico revisioni</h2>
      <div className="space-y-2">
        {past.map((revision) => (
          <details
            key={revision.id}
            className="group rounded-md border bg-card"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 p-3 text-sm">
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
              <span className="font-semibold">Rev {revision.revision_no}</span>
              <Badge variant="secondary">
                {revision.status === "ACCEPTED" &&
                revision.id !== acceptedRevisionId
                  ? MSG.offer.acceptedSupersededBadge
                  : OfferStatusLabels[revision.status]}
              </Badge>
              {isRenegotiationRevision(
                revision.revision_no,
                firstAcceptedNo,
              ) && (
                <Badge variant="outline">{MSG.offer.renegotiationBadge}</Badge>
              )}
              {revision.sent_at && (
                <span className="text-muted-foreground">
                  Inviata il {formatDateDDMMYYYYHHMM(revision.sent_at)}
                </span>
              )}
              <span className="ml-auto text-muted-foreground">
                {revision.lines.length}{" "}
                {revision.lines.length === 1
                  ? "configurazione"
                  : "configurazioni"}
              </span>
            </summary>
            <div className="space-y-4 border-t p-4">
              <div className="flex flex-wrap justify-end gap-2">
                {canExportOfferRevision(revision.status) && (
                  <OfferExportButtons
                    data={buildOfferRevisionExportData(offer, revision)}
                    exporterInitials={exporterInitials}
                  />
                )}
                {canCreateRevision && (
                  <CreateRevisionButton
                    offerId={offer.id}
                    sourceRevisionNo={revision.revision_no}
                    label="Crea nuova revisione da questa"
                    variant="outline"
                    size="sm"
                  />
                )}
              </div>
              <QuoteView
                offerId={offer.id}
                customerName={offer.customer_name}
                revision={revision}
                editable={false}
              />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
};

export default RevisionHistory;
