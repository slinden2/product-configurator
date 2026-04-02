import { redirect } from "next/navigation";
import UsersTable from "@/components/users-table";
import { getAllUsersWithStats, getUserData } from "@/db/queries";

const UtentiPage = async () => {
  const user = await getUserData();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/configurations");

  const users = await getAllUsersWithStats();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Utenti</h1>
      <UsersTable users={users} currentUserId={user.id} />
    </div>
  );
};

export default UtentiPage;
