// Shared async authorization gates for server actions. Not a "use server" module —
// these are plain helpers imported by action files, not actions themselves (the pure
// synchronous checks live in auth-checks.ts).
import { getOfferWorkingRevision, getUserData } from "@/db/queries";
import { canViewOffer } from "@/lib/access";
import { MSG } from "@/lib/messages";

/**
 * Admin gate: authenticated user with role ADMIN. `unauthorizedMsg` lets each
 * domain keep its own Italian rejection message (e.g. `MSG.coefficient.adminOnly`).
 */
export async function authorizeAdmin(
  unauthorizedMsg: string = MSG.auth.unauthorized,
) {
  const user = await getUserData();
  if (!user)
    return { success: false as const, error: MSG.auth.userNotAuthenticated };
  if (user.role !== "ADMIN")
    return { success: false as const, error: unauthorizedMsg };
  return { success: true as const, user };
}

/**
 * Shared offer-access + scope gate for offer mutations (revision lifecycle, line
 * add/remove). Does NOT require the working revision to be DRAFT — callers carry
 * their own state guards (send needs DRAFT, create needs a frozen latest, line
 * add/remove gate inside the query layer). Returns the scoped working revision
 * (id + status) without loading the full revision history.
 */
export async function authorizeOfferLifecycleAction(offerId: number) {
  const user = await getUserData();
  if (!user)
    return { success: false as const, error: MSG.auth.userNotAuthenticated };

  if (!canViewOffer(user.role)) {
    return { success: false as const, error: MSG.offer.unauthorized };
  }

  const revision = await getOfferWorkingRevision(offerId, user);
  if (!revision) return { success: false as const, error: MSG.offer.notFound };

  return { success: true as const, user, revision };
}

/**
 * Shared gate for revision header mutations: builds on
 * {@link authorizeOfferLifecycleAction} (offer access + scope + working revision) and
 * adds the pre-handoff edit window — the working revision must be DRAFT, since once it
 * advances the commercial terms freeze with the offer.
 */
export async function authorizeRevisionAction(offerId: number) {
  const auth = await authorizeOfferLifecycleAction(offerId);
  if (!auth.success) return auth;
  if (auth.revision.status !== "DRAFT") {
    return { success: false as const, error: MSG.offer.lineCannotEdit };
  }
  return auth;
}
