import { BadgeCheck, Eye, FilePen, Lock, type LucideIcon } from "lucide-react";
import {
  type ConfigOrigin,
  ConfigurationStatus,
  type ConfigurationStatusType,
  type Role,
} from "@/types";

export const STATUS_CONFIG: Record<
  ConfigurationStatusType,
  { label: string; color: string; icon: LucideIcon }
> = {
  DRAFT: { label: "Bozza", color: "#94a3b8", icon: FilePen },
  SALES_APPROVED: {
    label: "Approvato vendite",
    color: "#34d399",
    icon: BadgeCheck,
  },
  IN_TECH_REVIEW: {
    label: "In revisione tecnica",
    color: "#60a5fa",
    icon: Eye,
  },
  TECH_APPROVED: {
    label: "Approvato tecnico",
    color: "#fbbf24",
    icon: BadgeCheck,
  },
  CLOSED: { label: "Chiuso", color: "#fb7185", icon: Lock },
};

/**
 * Linear order of the workflow pipeline. A transition's direction is derived by
 * comparing the two statuses' indices here: a higher target index is "forward".
 * Derived from `ConfigurationStatus` (types/index.ts), which is declared in
 * pipeline order, so a new status is only added in one place.
 */
export const STATUS_PIPELINE: ConfigurationStatusType[] = [
  ...ConfigurationStatus,
];

export type TransitionDirection = "forward" | "backward";

export function getTransitionDirection(
  from: ConfigurationStatusType,
  to: ConfigurationStatusType,
): TransitionDirection {
  return STATUS_PIPELINE.indexOf(to) > STATUS_PIPELINE.indexOf(from)
    ? "forward"
    : "backward";
}

export interface StatusTransition {
  from: ConfigurationStatusType;
  to: ConfigurationStatusType;
  /** Italian UI button label. */
  label: string;
  /** Non-ADMIN roles permitted to perform this edge. ADMIN may perform any
   * defined edge (see canTransition); an empty array means the edge is
   * ADMIN-only. */
  roles: readonly Role[];
  /** Origins this edge applies to. */
  origins: readonly ConfigOrigin[];
}

/**
 * Single source of truth for the configuration status workflow: which
 * `from -> to` moves exist, the roles permitted to perform each, the origins
 * they apply to, and the Italian button label. `canTransition`
 * (app/actions/lib/auth-checks.ts), `getValidTransitions` (status-form.tsx, via
 * canTransition) and {@link getTransitionLabel} all read from this table, so a
 * new stage/role/edge is a single-row change.
 *
 * Two rules are layered on top in `canTransition` rather than encoded here:
 * - ADMIN may perform any DEFINED edge in this table for the origin, but NOT
 *   arbitrary non-adjacent jumps. ADMIN is intentionally absent from every row's
 *   `roles`; rows with an empty `roles` array (the CLOSED edges) are ADMIN-only
 *   and exist here to carry both the label and that ADMIN-only grant.
 * - On a STANDALONE config the hand-off statuses (SALES_APPROVED and
 *   IN_TECH_REVIEW) are off-limits to everyone.
 *
 * Direction (forward/backward) is NOT stored — it is derived from
 * STATUS_PIPELINE order via {@link getTransitionDirection}, keeping pipeline
 * order the single source for ordering.
 */
export const STATUS_TRANSITIONS: readonly StatusTransition[] = [
  // OFFER hand-off + engineering. There is no sales edge into SALES_APPROVED:
  // the only route in is the offer-acceptance fan-out (db/queries/offers.ts), so sales
  // roles have no rows in this table at all.
  {
    from: "SALES_APPROVED",
    to: "IN_TECH_REVIEW",
    label: "Prendi in revisione tecnica",
    roles: ["ENGINEER"],
    origins: ["OFFER"],
  },
  {
    from: "IN_TECH_REVIEW",
    to: "SALES_APPROVED",
    label: "Rimanda a vendite",
    roles: ["ENGINEER"],
    origins: ["OFFER"],
  },
  // STANDALONE working/approved machine (neither SALES_APPROVED nor
  // IN_TECH_REVIEW appears in the standalone chain — there is no hand-off, so
  // DRAFT connects straight to TECH_APPROVED).
  {
    from: "DRAFT",
    to: "TECH_APPROVED",
    label: "Approva",
    roles: ["ENGINEER"],
    origins: ["STANDALONE"],
  },
  {
    from: "TECH_APPROVED",
    to: "DRAFT",
    label: "Riapri",
    roles: ["ENGINEER"],
    origins: ["STANDALONE"],
  },
  // OFFER engineering approval
  {
    from: "IN_TECH_REVIEW",
    to: "TECH_APPROVED",
    label: "Approva",
    roles: ["ENGINEER"],
    origins: ["OFFER"],
  },
  {
    from: "TECH_APPROVED",
    to: "IN_TECH_REVIEW",
    label: "Riapri",
    roles: ["ENGINEER"],
    origins: ["OFFER"],
  },
  // ADMIN-only closing edges (empty roles → ADMIN-only; ADMIN reaches them via
  // canTransition, which grants ADMIN any defined workflow edge).
  {
    from: "TECH_APPROVED",
    to: "CLOSED",
    label: "Chiudi",
    roles: [],
    origins: ["OFFER", "STANDALONE"],
  },
  {
    from: "CLOSED",
    to: "TECH_APPROVED",
    label: "Riapri",
    roles: [],
    origins: ["OFFER", "STANDALONE"],
  },
];

/**
 * The transition row for an edge, if any. Origin-agnostic: no `(from, to)` pair
 * appears under more than one origin with a different label, so the label is
 * unambiguous without the origin.
 */
function findTransition(
  from: ConfigurationStatusType,
  to: ConfigurationStatusType,
): StatusTransition | undefined {
  return STATUS_TRANSITIONS.find((t) => t.from === from && t.to === to);
}

/**
 * Human-facing action label for a workflow edge. Named edges carry a dedicated
 * label; a rowless pair falls back to the target status label.
 */
export function getTransitionLabel(
  from: ConfigurationStatusType,
  to: ConfigurationStatusType,
): string {
  return findTransition(from, to)?.label ?? STATUS_CONFIG[to].label;
}

/**
 * Whether `from -> to` is a named workflow edge for `origin` (has a row in
 * STATUS_TRANSITIONS). Named edges surface as action buttons in the status
 * control, and are the complete set of transitions ADMIN may perform — there are
 * no arbitrary jumps.
 */
export function isWorkflowEdge(
  from: ConfigurationStatusType,
  to: ConfigurationStatusType,
  origin: ConfigOrigin,
): boolean {
  return STATUS_TRANSITIONS.some(
    (t) => t.from === from && t.to === to && t.origins.includes(origin),
  );
}

/**
 * Whether `role` may perform the `from -> to` edge for `origin` per the edge
 * table. ADMIN's defined-edge grant (via isWorkflowEdge) and the STANDALONE
 * sales-status guard are layered on top in `canTransition`
 * (app/actions/lib/auth-checks.ts).
 */
export function isRoleAllowedTransition(
  role: Role,
  from: ConfigurationStatusType,
  to: ConfigurationStatusType,
  origin: ConfigOrigin,
): boolean {
  return STATUS_TRANSITIONS.some(
    (t) =>
      t.from === from &&
      t.to === to &&
      t.origins.includes(origin) &&
      t.roles.includes(role),
  );
}
