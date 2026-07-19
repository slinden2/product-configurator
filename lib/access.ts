import {
  ALL_ACCESS_ROLES,
  CONFIG_MANAGER_ROLES,
  ENGINEERING_ROLES,
  OFFER_ALL_ACCESS_ROLES,
  OFFER_ROLES,
  SALES_ROLES,
} from "@/lib/roles";
import { isEditable } from "@/lib/status-config";
import type {
  ConfigOrigin,
  ConfigurationStatusType,
  OfferStatusType,
  Role,
} from "@/types";
import { OPEN_REVISION_STATUSES } from "@/types";

// The role-set constants live in the dependency-free lib/roles.ts (so
// status-config.ts can consume them without cycling through access.ts).
// Re-exported here so existing `@/lib/access` import sites keep working.
export {
  ALL_ACCESS_ROLES,
  CONFIG_MANAGER_ROLES,
  ENGINEERING_ROLES,
  OFFER_ALL_ACCESS_ROLES,
  OFFER_ROLES,
  SALES_ROLES,
};

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

/**
 * Roles that see the technical (configuration) side of the dashboard: the
 * intake / in-review queue cards and the configuration pipeline row. Same set
 * as {@link canManageStandaloneConfigs} (ENGINEERING_ROLES), so the dashboard
 * never shows a card linking into /configurazioni for a role that page would
 * redirect away.
 */
export const canViewTechnicalQueue = (role: Role): boolean =>
  ENGINEERING_ROLES.includes(role);

export const canViewOffer = (role: Role): boolean => OFFER_ROLES.includes(role);

/**
 * Roles allowed into the admin area (Gestione): user management and the
 * price/surcharge settings pages. Currently ADMIN only.
 */
export const canManageUsers = (role: Role): boolean => role === "ADMIN";

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
 * separately by canAccessOffer (db/queries/offers.ts); self-approval within scope is allowed.
 */
export const canApproveRevision = (role: Role): boolean =>
  role === "SALES_MANAGER" || role === "SALES_DIRECTOR" || role === "ADMIN";

export const canAccessAllOffers = (role: Role): boolean =>
  OFFER_ALL_ACCESS_ROLES.includes(role);

/**
 * Roles allowed to view the margin review page, which exposes cost AND the
 * customer's quoted price together. Restricted to management/system roles.
 */
export const canViewMarginReview = (role: Role): boolean =>
  OFFER_ALL_ACCESS_ROLES.includes(role);

/**
 * Roles allowed to open a post-acceptance commercial renegotiation on an accepted
 * offer (#85) — the "renegotiate" arm of the margin decision point, alongside the
 * absorb sign-off. Deliberately the same set as {@link canViewMarginReview}.
 */
export const canRenegotiateOffer = (role: Role): boolean =>
  OFFER_ALL_ACCESS_ROLES.includes(role);

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
