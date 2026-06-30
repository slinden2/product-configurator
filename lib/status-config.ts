import {
  BadgeCheck,
  Eye,
  FilePen,
  Lock,
  type LucideIcon,
  Send,
} from "lucide-react";
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
  IN_SALES_REVIEW: {
    label: "In revisione vendite",
    color: "#4ade80",
    icon: Send,
  },
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

/**
 * Whether two statuses are one step apart in the pipeline. Adjacent transitions
 * are surfaced as action buttons; non-adjacent ADMIN jumps use the dropdown.
 */
export function isAdjacentTransition(
  from: ConfigurationStatusType,
  to: ConfigurationStatusType,
): boolean {
  return (
    Math.abs(STATUS_PIPELINE.indexOf(to) - STATUS_PIPELINE.indexOf(from)) === 1
  );
}

export interface StatusTransition {
  from: ConfigurationStatusType;
  to: ConfigurationStatusType;
  /** Italian UI button label. */
  label: string;
  /** Non-ADMIN roles permitted to perform this edge. ADMIN may make any jump. */
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
 * - ADMIN may make ANY transition (including non-adjacent jumps this table
 *   cannot enumerate), so it is intentionally absent from every row's `roles`.
 *   Rows with an empty `roles` array (the CLOSED edges) are ADMIN-only and exist
 *   here purely to carry the label.
 * - On a STANDALONE config the two sales statuses are off-limits to everyone.
 *
 * Direction (forward/backward) is NOT stored — it is derived from
 * STATUS_PIPELINE order via {@link getTransitionDirection}, keeping pipeline
 * order the single source for ordering.
 */
export const STATUS_TRANSITIONS: readonly StatusTransition[] = [
  // OFFER sales sub-chain
  {
    from: "DRAFT",
    to: "IN_SALES_REVIEW",
    label: "Invia in revisione",
    roles: ["SALES", "SALES_MANAGER", "SALES_DIRECTOR"],
    origins: ["OFFER"],
  },
  {
    from: "IN_SALES_REVIEW",
    to: "DRAFT",
    label: "Rifiuta",
    roles: ["SALES_MANAGER", "SALES_DIRECTOR"],
    origins: ["OFFER"],
  },
  {
    from: "IN_SALES_REVIEW",
    to: "SALES_APPROVED",
    label: "Approva",
    roles: ["SALES_MANAGER", "SALES_DIRECTOR"],
    origins: ["OFFER"],
  },
  {
    from: "SALES_APPROVED",
    to: "IN_SALES_REVIEW",
    label: "Riapri vendite",
    roles: ["SALES_MANAGER", "SALES_DIRECTOR"],
    origins: ["OFFER"],
  },
  // OFFER hand-off + engineering
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
  // STANDALONE engineering entry. These are non-adjacent jumps, so they only
  // ever surface in the dropdown (which uses the target status label) — the
  // label here is for completeness and is not shown today.
  {
    from: "DRAFT",
    to: "IN_TECH_REVIEW",
    label: "Avvia revisione tecnica",
    roles: ["ENGINEER"],
    origins: ["STANDALONE"],
  },
  {
    from: "IN_TECH_REVIEW",
    to: "DRAFT",
    label: "Riporta in bozza",
    roles: ["ENGINEER"],
    origins: ["STANDALONE"],
  },
  // Engineering approval (both origins)
  {
    from: "IN_TECH_REVIEW",
    to: "TECH_APPROVED",
    label: "Approva",
    roles: ["ENGINEER"],
    origins: ["OFFER", "STANDALONE"],
  },
  {
    from: "TECH_APPROVED",
    to: "IN_TECH_REVIEW",
    label: "Riapri",
    roles: ["ENGINEER"],
    origins: ["OFFER", "STANDALONE"],
  },
  // ADMIN-only closing edges (empty roles → the row exists only to carry the
  // label; ADMIN reaches them via the blanket rule in canTransition).
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
 * Human-facing action label for a workflow edge. Adjacent (±1) edges are
 * reachable via buttons and carry a dedicated label; non-adjacent ADMIN jumps
 * have no row and fall back to the target status label.
 */
export function getTransitionLabel(
  from: ConfigurationStatusType,
  to: ConfigurationStatusType,
): string {
  return findTransition(from, to)?.label ?? STATUS_CONFIG[to].label;
}

/**
 * Whether `role` may perform the `from -> to` edge for `origin` per the edge
 * table. ADMIN's blanket power and the STANDALONE sales-status guard are layered
 * on top in `canTransition` (app/actions/lib/auth-checks.ts).
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
