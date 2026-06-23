import { isEditable } from "@/app/actions/lib/auth-checks";
import type { ConfigurationStatusType, Role } from "@/types";

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

export const canAccessAllConfigs = (role: Role): boolean =>
  ALL_ACCESS_ROLES.includes(role);

export const canManageConfigs = (role: Role): boolean =>
  CONFIG_MANAGER_ROLES.includes(role);

export const canViewBom = (role: Role): boolean =>
  role === "ENGINEER" || role === "ADMIN";

export const canViewOffer = (role: Role): boolean =>
  SALES_ROLES.includes(role) || role === "ADMIN";

/**
 * Roles allowed to view the margin review page, which exposes cost AND the
 * customer's quoted price together. Restricted to management/system roles.
 */
export const canViewMarginReview = (role: Role): boolean =>
  role === "ADMIN" || role === "SALES_DIRECTOR";

/** Returns true when the config cannot be edited (status frozen, unknown role, or unknown status). */
export const isConfigLocked = (
  status: ConfigurationStatusType | undefined,
  role: Role | undefined,
): boolean => !status || !role || !isEditable(status, role);
