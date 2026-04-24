import { redirect } from "next/navigation";
import { getUserData } from "@/db/queries";
import type { Role } from "@/types";

/**
 * Shared auth + role guard for configuration sub-routes (BOM, Offerta).
 * Redirects to /login if unauthenticated; redirects to `fallback(id)` when
 * `canAccess(role)` returns false.
 */
export async function configRouteGuard(
  params: Promise<{ id: string }>,
  canAccess: (role: Role) => boolean,
  fallback: (id: string) => string,
): Promise<void> {
  const [user, { id }] = await Promise.all([getUserData(), params]);
  if (!user) redirect("/login");
  if (!canAccess(user.role)) redirect(fallback(id));
}
