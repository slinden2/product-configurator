import Link from "next/link";
import PaginationControls from "@/components/shared/pagination-controls";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AllOffers } from "@/db/queries";
import { formatDateDDMMYYYYHHMM } from "@/lib/utils";
import { OfferStatusLabels } from "@/types";

interface AllOffersTableProps {
  offers: AllOffers;
  page: number;
  totalCount: number;
  pageSize: number;
  statusSlug?: string;
}

const headers = [
  "numero",
  "cliente",
  "stato",
  "righe",
  "creazione",
  "ultimo aggiornamento",
  "azioni",
];

const AllOffersTable = ({
  offers,
  page,
  totalCount,
  pageSize,
  statusSlug,
}: AllOffersTableProps) => {
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="w-full mt-5">
      <div className="rounded-md sm:border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {headers.map((header) => (
                <TableHead key={header} className="uppercase text-xs">
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {offers && offers.length > 0 ? (
              offers.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell className="font-medium">
                    {offer.offer_number}
                  </TableCell>
                  <TableCell>{offer.customer_name}</TableCell>
                  <TableCell>
                    {offer.status ? OfferStatusLabels[offer.status] : "—"}
                  </TableCell>
                  <TableCell>{offer.lineCount}</TableCell>
                  <TableCell>
                    {formatDateDDMMYYYYHHMM(offer.created_at)}
                  </TableCell>
                  <TableCell>
                    {formatDateDDMMYYYYHHMM(offer.updated_at)}
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/offerte/${offer.id}`}>Apri</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={headers.length}>
                  Non hai ancora offerte.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <PaginationControls
        page={page}
        totalPages={totalPages}
        buildHref={(p) => {
          const params = new URLSearchParams();
          if (statusSlug) params.set("status", statusSlug);
          params.set("page", String(p));
          return `/offerte?${params.toString()}`;
        }}
      />
    </div>
  );
};

export default AllOffersTable;
