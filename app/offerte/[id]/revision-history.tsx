import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { OfferWithRevisionAndLines } from "@/db/queries";
import { formatDateDDMMYYYYHHMM } from "@/lib/utils";
import { OfferStatusLabels } from "@/types";
import CreateRevisionButton from "./create-revision-button";
import QuoteView from "./quote-view";

interface RevisionHistoryProps {
  offerId: number;
  /** All revisions, newest-first; `revisions[0]` is the working revision. */
  revisions: OfferWithRevisionAndLines["revisions"];
  /** True when a new revision can be created (the working revision is frozen, so no
   * open draft exists). Gates the per-revision "revert" buttons. */
  canCreateRevision: boolean;
}

/**
 * Inline, collapsible history of the offer's past (non-working) revisions. Each row
 * expands to its read-only quote and, when allowed, a button to clone-forward a new
 * revision from it ("revert"). Renders nothing when there is no history yet.
 */
const RevisionHistory = ({
  offerId,
  revisions,
  canCreateRevision,
}: RevisionHistoryProps) => {
  // revisions[0] is the working revision, shown at the top of the page; everything
  // after it is immutable history.
  const past = revisions.slice(1);
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
                {OfferStatusLabels[revision.status]}
              </Badge>
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
              {canCreateRevision && (
                <div className="flex justify-end">
                  <CreateRevisionButton
                    offerId={offerId}
                    sourceRevisionNo={revision.revision_no}
                    label="Crea nuova revisione da questa"
                    variant="outline"
                    size="sm"
                  />
                </div>
              )}
              <QuoteView
                offerId={offerId}
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
