import { Pencil, PlusCircle } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ConfigurationStatusBadge from "@/components/all-configuration-table/configuration-status-badge";
import BackButton from "@/components/back-button";
import RenegotiateRevisionButton from "@/components/offer/renegotiate-revision-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getOfferWithRevisionAndLines, getUserData } from "@/db/queries";
import {
  canApproveRevision,
  canExportOfferRevision,
  canRenegotiateOffer,
  canViewMarginReview,
} from "@/lib/access";
import {
  computeLineMarginAlerts,
  type LineMarginAlert,
} from "@/lib/margin-alerts";
import { MSG } from "@/lib/messages";
import { buildOfferRevisionExportData } from "@/lib/offer-export";
import {
  firstAcceptedRevisionNo,
  isRenegotiationRevision,
} from "@/lib/offer-renegotiation";
import { OfferStatusLabels, OPEN_REVISION_STATUSES } from "@/types";
import AcceptRevisionButton from "./accept-revision-button";
import ApproveRevisionButton from "./approve-revision-button";
import CreateRevisionButton from "./create-revision-button";
import OfferExportButtons from "./export-offer-buttons";
import QuoteView from "./quote-view";
import RecordOutcomeButton from "./record-outcome-button";
import RejectRevisionButton from "./reject-revision-button";
import RemoveLineButton from "./remove-line-button";
import RevisionHistory from "./revision-history";
import SendRevisionButton from "./send-revision-button";
import SubmitForApprovalButton from "./submit-for-approval-button";
import UnacceptRevisionButton from "./unaccept-revision-button";

interface OfferDetailProps {
  params: Promise<{ id: string }>;
}

const OfferDetail = async (props: OfferDetailProps) => {
  const params = await props.params;
  const offerId = parseInt(params.id, 10);
  if (Number.isNaN(offerId)) notFound();

  const user = await getUserData();
  if (!user) redirect("/login");

  // Returns null when the offer doesn't exist or is out of the user's scope.
  const offer = await getOfferWithRevisionAndLines(offerId, user);
  if (!offer) notFound();

  // revisions[0] is the working revision (the latest by revision_no); the rest are
  // immutable history.
  const revision = offer.revisions[0];
  // Once a revision is accepted the offer locks — clone-forward revisions stop;
  // only commercial-only renegotiation revisions can follow.
  const isAccepted = offer.accepted_revision_id !== null;
  // A working revision on an accepted offer is a renegotiation: commercial terms
  // stay editable while DRAFT, but its configuration set is read-only.
  const firstAcceptedNo = firstAcceptedRevisionNo(offer.revisions);
  const workingIsRenegotiation =
    !!revision &&
    isRenegotiationRevision(revision.revision_no, firstAcceptedNo);
  // Commercial terms (quote card) are editable only while the working revision is
  // DRAFT; the configuration set additionally requires a pre-acceptance revision.
  const commercialEditable = revision?.status === "DRAFT";
  const configsEditable = commercialEditable && !workingIsRenegotiation;
  // A new revision can be cloned forward only once the working revision has been sent
  // (left the open working states) — one open working revision at a time — and the
  // offer has not been accepted.
  const canCreateRevision =
    !!revision &&
    !OPEN_REVISION_STATUSES.includes(revision.status) &&
    !isAccepted;
  // Renegotiation (post-acceptance re-quote) is the management counterpart: accepted
  // offer, no open working revision, ADMIN/SALES_DIRECTOR only.
  const canRenegotiate =
    !!revision &&
    !OPEN_REVISION_STATUSES.includes(revision.status) &&
    isAccepted &&
    canRenegotiateOffer(user.role);
  // ADMIN-only correction: undo a mistaken acceptance. Offered only on the in-force
  // first-acceptance revision (a renegotiation re-acceptance is out of scope, blocked
  // server-side too); the action re-checks role, state, and the engineering guard.
  const canUnaccept =
    user.role === "ADMIN" &&
    !!revision &&
    revision.status === "ACCEPTED" &&
    revision.id === offer.accepted_revision_id &&
    !workingIsRenegotiation;
  // Approve / reject / un-approve are management-only (scope already enforced by the
  // scoped fetch above).
  const canApprove = canApproveRevision(user.role);
  const lines = revision?.lines ?? [];

  // Derived margin alerts: only for the accepted revision's frozen lines, and
  // only computed for roles allowed to see margin data (ADMIN/SALES_DIRECTOR) —
  // server-side, so margin figures never reach other roles' payloads. Keyed by
  // configuration id so the badges also render on an open renegotiation's rows
  // (same configs, different lines).
  const acceptedRevision = offer.revisions.find(
    (rev) => rev.id === offer.accepted_revision_id,
  );
  const marginAlertsByConfig = new Map<number, LineMarginAlert>();
  if (canViewMarginReview(user.role) && acceptedRevision) {
    const alerts = await computeLineMarginAlerts(
      acceptedRevision.lines,
      Number(acceptedRevision.discount_pct),
    );
    for (const alert of alerts.values()) {
      marginAlertsByConfig.set(alert.configurationId, alert);
    }
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-start sm:gap-2">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Offerta {offer.offer_number}
          </h1>
          <p className="text-muted-foreground">{offer.customer_name}</p>
          {offer.customer_address && (
            <p className="text-sm text-muted-foreground">
              {offer.customer_address}
            </p>
          )}
          {offer.customer_email && (
            <p className="text-sm text-muted-foreground">
              {offer.customer_email}
            </p>
          )}
        </div>
        {revision && (
          <div className="mt-4 flex flex-wrap items-center gap-3 sm:mt-0 sm:ml-auto">
            <span className="text-sm text-muted-foreground">
              Rev {revision.revision_no} · {OfferStatusLabels[revision.status]}
            </span>
            {workingIsRenegotiation && (
              <Badge variant="outline">{MSG.offer.renegotiationBadge}</Badge>
            )}
            {revision.status === "DRAFT" && lines.length > 0 && (
              <SubmitForApprovalButton offerId={offer.id} />
            )}
            {revision.status === "PENDING_APPROVAL" && canApprove && (
              <>
                <ApproveRevisionButton offerId={offer.id} />
                <RejectRevisionButton offerId={offer.id} mode="reject" />
              </>
            )}
            {revision.status === "APPROVED_TO_SEND" && (
              <>
                <SendRevisionButton offerId={offer.id} />
                {canApprove && (
                  <RejectRevisionButton offerId={offer.id} mode="unapprove" />
                )}
              </>
            )}
            {revision.status === "SENT" && (
              <>
                <AcceptRevisionButton
                  offerId={offer.id}
                  renegotiation={workingIsRenegotiation}
                />
                <RecordOutcomeButton offerId={offer.id} outcome="REJECTED" />
                <RecordOutcomeButton offerId={offer.id} outcome="EXPIRED" />
              </>
            )}
            {canCreateRevision && <CreateRevisionButton offerId={offer.id} />}
            {canRenegotiate && <RenegotiateRevisionButton offerId={offer.id} />}
            {canUnaccept && <UnacceptRevisionButton offerId={offer.id} />}
            {canExportOfferRevision(revision.status) && (
              <OfferExportButtons
                data={buildOfferRevisionExportData(offer, revision)}
                exporterInitials={user.initials ?? ""}
              />
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Configurazioni</h2>
          {configsEditable && (
            <Link href={`/configurazioni/nuova?offerId=${offer.id}`}>
              <Button className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                <span>Aggiungi configurazione</span>
              </Button>
            </Link>
          )}
        </div>

        <div className="rounded-md sm:border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="uppercase text-xs">pos.</TableHead>
                <TableHead className="uppercase text-xs">
                  configurazione
                </TableHead>
                <TableHead className="uppercase text-xs">stato</TableHead>
                <TableHead className="uppercase text-xs">qtà</TableHead>
                <TableHead className="uppercase text-xs">azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length > 0 ? (
                lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>{line.position + 1}</TableCell>
                    <TableCell className="font-medium">
                      {line.configuration.name || "Configurazione"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <ConfigurationStatusBadge
                          status={line.configuration.status}
                        />
                        {marginAlertsByConfig.get(line.configuration.id)
                          ?.alertActive && (
                          <Link
                            href={`/configurazioni/marginalita/${line.configuration.id}`}
                          >
                            <Badge variant="destructive">
                              {MSG.marginReview.belowThresholdBadge}
                            </Badge>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{line.quantity}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link
                            href={`/configurazioni/modifica/${line.configuration.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                            {configsEditable ? "Modifica" : "Apri"}
                          </Link>
                        </Button>
                        {configsEditable && (
                          <RemoveLineButton
                            offerId={offer.id}
                            configId={line.configuration.id}
                            configName={
                              line.configuration.name || "Configurazione"
                            }
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5}>
                    Nessuna configurazione. Aggiungine una per iniziare.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {revision && (
        <QuoteView
          offerId={offer.id}
          revision={revision}
          editable={commercialEditable}
        />
      )}

      <RevisionHistory
        offer={offer}
        canCreateRevision={canCreateRevision}
        exporterInitials={user.initials ?? ""}
        acceptedRevisionId={offer.accepted_revision_id}
        firstAcceptedNo={firstAcceptedNo}
      />

      <BackButton fallbackPath="/offerte" />
    </div>
  );
};

export default OfferDetail;
