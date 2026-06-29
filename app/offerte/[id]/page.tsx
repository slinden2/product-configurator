import { Pencil, PlusCircle } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ConfigurationStatusBadge from "@/components/all-configuration-table/configuration-status-badge";
import BackButton from "@/components/back-button";
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
import { OfferStatusLabels } from "@/types";
import CreateRevisionButton from "./create-revision-button";
import QuoteView from "./quote-view";
import RemoveLineButton from "./remove-line-button";
import RevisionHistory from "./revision-history";
import SendRevisionButton from "./send-revision-button";

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
  // Offer lines are editable only while the working revision is DRAFT.
  const editable = revision?.status === "DRAFT";
  // A new revision can be cloned forward only once the working revision is frozen —
  // one editable working draft at a time.
  const canCreateRevision = !!revision && revision.status !== "DRAFT";
  const lines = revision?.lines ?? [];

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
          <div className="mt-4 flex items-center gap-3 sm:mt-0 sm:ml-auto">
            <span className="text-sm text-muted-foreground">
              Rev {revision.revision_no} · {OfferStatusLabels[revision.status]}
            </span>
            {editable && lines.length > 0 && (
              <SendRevisionButton offerId={offer.id} />
            )}
            {canCreateRevision && <CreateRevisionButton offerId={offer.id} />}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Configurazioni</h2>
          {editable && (
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
                      <ConfigurationStatusBadge
                        status={line.configuration.status}
                      />
                    </TableCell>
                    <TableCell>{line.quantity}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link
                            href={`/configurazioni/modifica/${line.configuration.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                            {editable ? "Modifica" : "Apri"}
                          </Link>
                        </Button>
                        {editable && (
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
        <QuoteView offerId={offer.id} revision={revision} editable={editable} />
      )}

      <RevisionHistory
        offerId={offer.id}
        revisions={offer.revisions}
        canCreateRevision={canCreateRevision}
      />

      <BackButton fallbackPath="/offerte" />
    </div>
  );
};

export default OfferDetail;
