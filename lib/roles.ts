import type { Role } from "@/types";

/**
 * Canonical role-set constants, in one dependency-free module.
 *
 * They live here (not in `lib/access.ts`) so both `lib/access.ts` and
 * `lib/status-config.ts` can consume them without forming an import cycle —
 * `access.ts` imports `isEditable` from `status-config.ts`, so the shared sets
 * cannot live in either. `lib/access.ts` re-exports every constant, so existing
 * `@/lib/access` import sites keep working.
 */

/** Sales-side roles that capture or review offers. */
export const SALES_ROLES: Role[] = ["SALES", "SALES_MANAGER", "SALES_DIRECTOR"];

/**
 * Roles that can view and act on every configuration regardless of ownership.
 * Used as the explicit allowlist for scope checks so unknown/future roles fail
 * closed instead of inheriting full access.
 */
export const ALL_ACCESS_ROLES: Role[] = ["ADMIN", "ENGINEER", "SALES_DIRECTOR"];

/**
 * Roles allowed to manage (edit/duplicate/delete) configurations within their
 * access scope without owning them. Bare SALES manage only their own configs.
 */
export const CONFIG_MANAGER_ROLES: Role[] = [
  "ADMIN",
  "ENGINEER",
  "SALES_MANAGER",
  "SALES_DIRECTOR",
];

/**
 * Engineering-side roles: own the standalone technical config area and can view
 * the BOM. Sales roles work from offers and never touch engineering surfaces.
 */
export const ENGINEERING_ROLES: Role[] = ["ENGINEER", "ADMIN"];

/** Roles allowed to view an offer: all sales roles plus ADMIN (ENGINEER excluded). */
export const OFFER_ROLES: Role[] = [...SALES_ROLES, "ADMIN"];

/**
 * Offer-side equivalent of `ALL_ACCESS_ROLES`: roles that see every offer
 * regardless of ownership. Note this deliberately EXCLUDES ENGINEER (who has no
 * offer access at all), so it cannot reuse `ALL_ACCESS_ROLES`.
 */
export const OFFER_ALL_ACCESS_ROLES: Role[] = ["ADMIN", "SALES_DIRECTOR"];
