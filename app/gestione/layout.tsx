import { redirect } from "next/navigation";
import ManagementTabs from "@/components/management-tabs";
import { getUserData } from "@/db/queries";

export default async function ManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserData();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/configurazioni");

  return (
    <div className="space-y-6">
      <ManagementTabs />
      {children}
    </div>
  );
}
