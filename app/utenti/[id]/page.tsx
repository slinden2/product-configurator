import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import ActivityLogTable from "@/components/activity-log-table";
import {
  getUserActivityLog,
  getUserData,
  getUserProfileById,
} from "@/db/queries";

const PAGE_SIZE = 20;

const UserDetailPage = async (props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) => {
  const user = await getUserData();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/configurations");

  const { id } = await props.params;
  const { page: pageParam } = await props.searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const [targetUser, { data: entries, totalCount }] = await Promise.all([
    getUserProfileById(id),
    getUserActivityLog(id, page, PAGE_SIZE),
  ]);

  if (!targetUser) redirect("/utenti");

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  if (page > totalPages && totalPages > 0) {
    redirect(`/utenti/${id}?page=${totalPages}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/utenti"
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {targetUser.email}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ruolo: {targetUser.role}
            {targetUser.initials ? ` · Iniziali: ${targetUser.initials}` : ""}
          </p>
        </div>
      </div>

      <h2 className="text-lg font-semibold">Log attività</h2>
      <ActivityLogTable
        entries={entries}
        page={page}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        userId={id}
      />
    </div>
  );
};

export default UserDetailPage;
