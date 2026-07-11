import { redirect } from "next/navigation";
import { getUserData } from "@/db/queries";
import { canManageUsers } from "@/lib/access";

/**
 * Shared page-level ADMIN guard for /gestione data pages (defense in depth —
 * layouts are not a reliable auth boundary on soft navigation). Mirrors the
 * layout gate: redirects to /login when unauthenticated, /configurazioni when
 * not ADMIN. Returns the authenticated ADMIN user for callers that need it.
 */
export async function gestioneRouteGuard(): Promise<
  NonNullable<Awaited<ReturnType<typeof getUserData>>>
> {
  const user = await getUserData();
  if (!user) redirect("/login");
  if (!canManageUsers(user.role)) redirect("/configurazioni");
  return user;
}
