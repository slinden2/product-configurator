import { Pencil, PlusCircle } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ConfigurationStatusBadge from "@/components/all-configuration-table/configuration-status-badge";
import BackButton from "@/components/back-button";
import OfferMarginOverview from "@/components/offer/offer-margin-overview";
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
  canViewOffer,
} from "@/lib/access";
import {
  computeLineMarginAlerts,
  hasActiveMarginAlert,
  type LineMarginAlert,
} from "@/lib/margin-alerts";
import { MSG } from "@/lib/messages";
import { buildOfferRevisionExportData } from "@/lib/offer-export";
import {
  buildMarginOverviewRows,
  buildProjectedMarginOverview,
  deriveRenegotiationHubState,
  hasProjectableRenegotiation,
  marginHubAcceptedRevision,
  type ProjectedMarginOverview,
} from "@/lib/offer-margin-hub";
import {
  firstAcceptedRevisionNo,
  isRenegotiationRevision,
} from "@/lib/offer-renegotiation";
import { OfferStatusLabels, OPEN_REVISION_STATUSES } from "@/types";
import AcceptRevisionButton from "./accept-revision-button";
import ApproveRevisionButton from "./approve-revision-button";
import CreateRevisionButton from "./create-revision-button";
import DiscardRevisionButton from "./discard-revision-button";
import EditOfferHeaderButton from "./edit-offer-header-button";
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
  // Page-authoritative auth (doctrine #102): every gated page runs its own role
  // check before any data access — guard layouts are not authoritative. ENGINEER
  // has no offer area.
  if (!canViewOffer(user.role)) redirect("/");

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

  // Derived margin alerts: only for the accepted revision's frozen lines, and
  // only computed for roles allowed to see margin data (ADMIN/SALES_DIRECTOR) —
  // server-side, so margin figures never reach other roles' payloads. The map is
  // keyed by line id (for the hub); a config-keyed copy backs the inline table
  // badge (which also renders on an open renegotiation's rows — same configs,
  // new lines). `marginHubAcceptedRevision` folds the role gate and the
  // superseded-safe `accepted_revision_id` match, so it is null for unauthorized
  // roles and no alerts are computed.
  const canSeeMargin = canViewMarginReview(user.role);
  const acceptedRevision = marginHubAcceptedRevision(
    canSeeMargin,
    offer.revisions,
    offer.accepted_revision_id,
  );
  let marginAlerts = new Map<number, LineMarginAlert>();
  if (acceptedRevision) {
    marginAlerts = await computeLineMarginAlerts(
      acceptedRevision.lines,
      Number(acceptedRevision.discount_pct),
    );
  }
  const marginAlertsByConfig = new Map<number, LineMarginAlert>();
  for (const alert of marginAlerts.values()) {
    marginAlertsByConfig.set(alert.configurationId, alert);
  }

  // Renegotiation (post-acceptance re-quote) is the management counterpart:
  // accepted offer, no open working revision, ADMIN/SALES_DIRECTOR only, and
  // narrowed (#269) to require at least one accepted line with an active margin
  // alert — renegotiation is a margin remedy, not a free re-quote.
  const canRenegotiate =
    !!revision &&
    !OPEN_REVISION_STATUSES.includes(revision.status) &&
    isAccepted &&
    canRenegotiateOffer(user.role) &&
    hasActiveMarginAlert(marginAlerts.values());
  // Discard the working draft (#266): only a DRAFT that has a predecessor to fall back on
  // (an offer must always keep at least one revision — revision 1 is never discardable).
  // Discarding a renegotiation is management-only, symmetric with who may open one.
  const canDiscardRevision =
    !!revision &&
    revision.status === "DRAFT" &&
    offer.revisions.length > 1 &&
    (!workingIsRenegotiation || canRenegotiateOffer(user.role));
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

  // Margin hub view-model: one row per accepted-revision line with an explicit
  // state, plus the renegotiation affordance. Both empty/none for unauthorized
  // roles (acceptedRevision is null then). See lib/offer-margin-hub.
  const marginOverviewRows = buildMarginOverviewRows(
    acceptedRevision,
    marginAlerts,
  );
  const renegotiationHub = deriveRenegotiationHubState(
    canRenegotiate,
    revision,
    workingIsRenegotiation,
  );

  // Projected (working-revision) margin overview for the hub's revision selector.
  // Computed only when a live renegotiation exists (hasProjectableRenegotiation),
  // so the extra EBOM query runs only when the selector will show. The DRAFT
  // renegotiation lines carry live re-derived pricing but no as-sold freeze, so
  // the alerts use the non-frozen path (requireFrozen: false).
  let projectedOverview: ProjectedMarginOverview | null = null;
  if (
    acceptedRevision &&
    revision &&
    hasProjectableRenegotiation(
      revision,
      offer.accepted_revision_id,
      workingIsRenegotiation,
    )
  ) {
    const projectedAlerts = await computeLineMarginAlerts(
      revision.lines,
      Number(revision.discount_pct),
      { requireFrozen: false },
    );
    projectedOverview = buildProjectedMarginOverview(revision, projectedAlerts);
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-start sm:gap-2">
        <div>
          <div className="flex items-center gap-1 mb-2">
            <h1 className="text-3xl font-bold">Offerta {offer.offer_number}</h1>
            {/* The header is offer-level, not revision-scoped: correctable at any
                lifecycle stage, so this affordance is never gated on the revision. */}
            <EditOfferHeaderButton
              offerId={offer.id}
              customerName={offer.customer_name}
              customerAddress={offer.customer_address}
              customerEmail={offer.customer_email}
              revisionSent={!commercialEditable}
            />
          </div>
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
            {/* Deliberately outside the `lines.length > 0` guard above: an empty draft is
                exactly the one an agent most wants to throw away. */}
            {canDiscardRevision && (
              <DiscardRevisionButton
                offerId={offer.id}
                renegotiation={workingIsRenegotiation}
              />
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
                      {offer.customer_name}
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
                            configName={offer.customer_name}
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

      {acceptedRevision && (
        // Keyed on projection presence so the selector resets to its default
        // when a renegotiation appears/disappears (e.g. right after "Rinegozia"
        // on this same page). Without a changing key the hub's already-mounted
        // useState would survive the revalidate and keep showing "accepted".
        // The key is stable across repricing (same revision_no), so an engineer
        // edit updates the numbers without snapping the user off their tab.
        <OfferMarginOverview
          key={
            projectedOverview ? `proj-${projectedOverview.revisionNo}` : "base"
          }
          offerId={offer.id}
          acceptedRevisionNo={acceptedRevision.revision_no}
          rows={marginOverviewRows}
          projected={projectedOverview}
          renegotiation={renegotiationHub}
        />
      )}

      {revision && (
        <QuoteView
          offerId={offer.id}
          customerName={offer.customer_name}
          customerAddress={offer.customer_address}
          revision={revision}
          editable={commercialEditable}
        />
      )}

      <RevisionHistory
        offer={offer}
        canCreateRevision={canCreateRevision}
        exporterInitials={user.initials ?? ""}
        firstAcceptedNo={firstAcceptedNo}
      />

      <BackButton fallbackPath="/offerte" />
    </div>
  );
};

export default OfferDetail;
