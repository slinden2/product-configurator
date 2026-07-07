import UsersTable from "@/components/users-table";
import { getAllUsersWithStats } from "@/db/queries";
import { gestioneRouteGuard } from "../lib/gestione-route-guard";

const UsersPage = async () => {
  const user = await gestioneRouteGuard();

  const users = await getAllUsersWithStats();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Utenti</h1>
      <UsersTable users={users} currentUserId={user.id} />
    </div>
  );
};

export default UsersPage;
