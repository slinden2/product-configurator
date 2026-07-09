import { isEditable } from "@/lib/status-config";
import type {
  ConfigOrigin,
  ConfigurationStatusType,
  OfferStatusType,
  Role,
} from "@/types";
import { OPEN_REVISION_STATUSES } from "@/types";

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

export const canAccessAllConfigs = (role: Role): boolean =>
  ALL_ACCESS_ROLES.includes(role);

export const canManageConfigs = (role: Role): boolean =>
  CONFIG_MANAGER_ROLES.includes(role);

export const canViewBom = (role: Role): boolean =>
  ENGINEERING_ROLES.includes(role);

/**
 * Roles that own the standalone (pure technical) configuration area: the
 * "Technical" list, creation, and the engineering lifecycle. Sales roles work
 * from offers instead and never see standalone configs.
 */
export const canManageStandaloneConfigs = (role: Role): boolean =>
  ENGINEERING_ROLES.includes(role);

export const canViewOffer = (role: Role): boolean => OFFER_ROLES.includes(role);

/**
 * True once an offer revision has left the open working states (`SENT` and
 * beyond), i.e. its `pricing_snapshot` is frozen. Gates the customer-facing
 * Excel/PDF export so only sent (manager-approved) quotes can be downloaded —
 * a DRAFT/in-approval revision is never the deliverable. The complement of
 * {@link OPEN_REVISION_STATUSES}, mirroring how the offer page derives
 * `canCreateRevision`.
 */
export const canExportOfferRevision = (status: OfferStatusType): boolean =>
  !OPEN_REVISION_STATUSES.includes(status);

/**
 * Roles allowed to approve an offer revision for send (and to reject / un-approve it
 * back to DRAFT). Sales agents capture and submit offers but cannot approve their own —
 * approval is a management gate. Scope (manager → own + direct reports) is enforced
 * separately by {@link canAccessOffer}; self-approval within scope is allowed.
 */
export const canApproveRevision = (role: Role): boolean =>
  role === "SALES_MANAGER" || role === "SALES_DIRECTOR" || role === "ADMIN";

/**
 * Offer-side equivalent of {@link canAccessAllConfigs}: roles that see every offer regardless of
 * ownership. Note this deliberately EXCLUDES ENGINEER (who has no offer access at all), so it
 * cannot reuse `ALL_ACCESS_ROLES`.
 */
export const OFFER_ALL_ACCESS_ROLES: Role[] = ["ADMIN", "SALES_DIRECTOR"];

export const canAccessAllOffers = (role: Role): boolean =>
  OFFER_ALL_ACCESS_ROLES.includes(role);

/**
 * Roles allowed to view the margin review page, which exposes cost AND the
 * customer's quoted price together. Restricted to management/system roles.
 */
export const canViewMarginReview = (role: Role): boolean =>
  role === "ADMIN" || role === "SALES_DIRECTOR";

/**
 * Roles allowed to open a post-acceptance commercial renegotiation on an accepted
 * offer (#85) — the "renegotiate" arm of the margin decision point, alongside the
 * absorb sign-off. Deliberately the same set as {@link canViewMarginReview}.
 */
export const canRenegotiateOffer = (role: Role): boolean =>
  role === "ADMIN" || role === "SALES_DIRECTOR";

/**
 * Returns true when the config cannot be edited (status frozen, unknown role, or
 * unknown status). `origin` defaults to `"OFFER"`. For an offer-owned config in
 * the pre-handoff zone, pass `offerRevisionStatus` so the two-phase gate (editable
 * only while the revision is DRAFT) is applied — otherwise it fails closed.
 */
export const isConfigLocked = (
  status: ConfigurationStatusType | undefined,
  role: Role | undefined,
  origin: ConfigOrigin = "OFFER",
  offerRevisionStatus?: OfferStatusType,
): boolean =>
  !status || !role || !isEditable(status, role, origin, offerRevisionStatus);
