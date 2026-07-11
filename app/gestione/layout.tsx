import { redirect } from "next/navigation";
import ManagementTabs from "@/components/management-tabs";
import { getUserData } from "@/db/queries";
import { canManageUsers } from "@/lib/access";

export default async function ManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserData();
  if (!user) redirect("/login");
  if (!canManageUsers(user.role)) redirect("/configurazioni");

  return (
    <div className="space-y-6">
      <ManagementTabs />
      {children}
    </div>
  );
}
