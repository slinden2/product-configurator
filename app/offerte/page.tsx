import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import AllOffersTable from "@/components/all-offers-table";
import { Button } from "@/components/ui/button";
import { getUserData, getUserOffers } from "@/db/queries";

const PAGE_SIZE = 20;

const Offers = async (props: { searchParams: Promise<{ page?: string }> }) => {
  const user = await getUserData();
  if (!user) redirect("/login");

  const { page: pageParam } = await props.searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const { data: offers, totalCount } = await getUserOffers(
    user,
    page,
    PAGE_SIZE,
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  if (page > totalPages) {
    redirect(`/offerte?page=${totalPages}`);
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
      <AllOffersTable
        offers={offers}
        page={page}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
};

export default Offers;
