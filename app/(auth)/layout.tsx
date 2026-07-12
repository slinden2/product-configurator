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

  // Shared auth-page shell. No height class: the root layout's min-h-screen
  // column already fills the viewport, and h-screen here only forced overflow.
  return (
    <section className="flex justify-center">
      <div className="w-2/3 flex flex-col gap-4">{children}</div>
    </section>
  );
}
