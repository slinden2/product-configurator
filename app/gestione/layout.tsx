import { redirect } from "next/navigation";
import GestioneTabs from "@/components/gestione-tabs";
import { getUserData } from "@/db/queries";

export default async function GestioneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserData();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/configurazioni");

  return (
    <div className="space-y-6">
      <GestioneTabs />
      {children}
    </div>
  );
}
