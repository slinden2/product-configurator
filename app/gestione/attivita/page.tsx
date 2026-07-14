import { redirect } from "next/navigation";
import ActivityLogTable from "@/components/activity-log-table";
import { getActivityLog, getAllUsersWithStats } from "@/db/queries";
import { ActivityActions } from "@/types";
import { gestioneRouteGuard } from "../lib/gestione-route-guard";
import ActivityFilters from "./activity-filters";

const PAGE_SIZE = 20;

const ActivityPage = async (props: {
  searchParams: Promise<{ page?: string; action?: string; user?: string }>;
}) => {
  await gestioneRouteGuard();

  const {
    page: pageParam,
    action: actionParam,
    user: userParam,
  } = await props.searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const action = ActivityActions.find((a) => a === actionParam);

  // The users are needed for the filter select anyway; matching `user` against
  // them also keeps a hand-edited, non-uuid param out of the query.
  const users = await getAllUsersWithStats();
  const userId = users.some((u) => u.id === userParam) ? userParam : undefined;

  const { data: entries, totalCount } = await getActivityLog(
    { action, userId },
    page,
    PAGE_SIZE,
  );

  const buildHref = (target: number) => {
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (userId) params.set("user", userId);
    params.set("page", String(target));
    return `/gestione/attivita?${params.toString()}`;
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  if (page > totalPages) {
    redirect(buildHref(totalPages));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Attività</h1>
      <ActivityFilters
        users={users.map((u) => ({ id: u.id, email: u.email }))}
        action={action}
        userId={userId}
      />
      <ActivityLogTable
        entries={entries}
        page={page}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        buildHref={buildHref}
        showUser
      />
    </div>
  );
};

export default ActivityPage;
