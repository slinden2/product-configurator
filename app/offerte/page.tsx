import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import AllOffersTable from "@/components/all-offers-table";
import { ActiveStatusFilter } from "@/components/shared/active-status-filter";
import { Button } from "@/components/ui/button";
import { getUserData, getUserOffers } from "@/db/queries";
import { canViewOffer } from "@/lib/access";
import {
  buildStatusListHref,
  offerStatusToSlug,
  parseOfferStatusSlug,
} from "@/lib/status-slugs";
import { OfferStatusLabels } from "@/types";

const PAGE_SIZE = 20;

const Offers = async (props: {
  searchParams: Promise<{ page?: string; status?: string | string[] }>;
}) => {
  const user = await getUserData();
  if (!user) redirect("/login");
  // Page-authoritative auth (doctrine #102): every gated page runs its own role
  // check before any data access — guard layouts are not authoritative. ENGINEER
  // has no offer area.
  if (!canViewOffer(user.role)) redirect("/");

  const { page: pageParam, status: statusParam } = await props.searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const statusFilter = parseOfferStatusSlug(
    typeof statusParam === "string" ? statusParam : undefined,
  );
  // Canonical slug re-derived from the parsed status: an unknown or repeated
  // `?status=` never propagates into pagination links or redirects.
  const statusSlug = statusFilter ? offerStatusToSlug(statusFilter) : undefined;

  const { data: offers, totalCount } = await getUserOffers(
    user,
    page,
    PAGE_SIZE,
    statusFilter,
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  if (page > totalPages) {
    redirect(buildStatusListHref("/offerte", totalPages, statusSlug));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Offerte</h1>
        <div>
          <Link href="/offerte/nuova">
            <Button className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              <span>Nuova offerta</span>
            </Button>
          </Link>
        </div>
      </div>
      {statusFilter && (
        <ActiveStatusFilter
          label={OfferStatusLabels[statusFilter]}
          clearHref="/offerte"
        />
      )}
      <AllOffersTable
        offers={offers}
        page={page}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        statusSlug={statusSlug}
      />
    </div>
  );
};

export default Offers;
