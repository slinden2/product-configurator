import { redirect } from "next/navigation";
import { getUserData } from "@/db/queries";

export default async function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Gate on the active profile, not the raw session: a session without an
  // active profile (e.g. a pending account after a password reset) must be able
  // to reach the auth pages, or it would bounce between "/" and "/login".
  const user = await getUserData();

  if (user) {
    redirect("/");
  }

  return <>{children}</>;
}
