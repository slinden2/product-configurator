import {
  BadgeCheck,
  Eye,
  FilePen,
  Lock,
  type LucideIcon,
  Send,
} from "lucide-react";
import { ConfigurationStatus, type ConfigurationStatusType } from "@/types";

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
  IN_REVIEW: { label: "In revisione", color: "#60a5fa", icon: Eye },
  APPROVED: { label: "Approvato", color: "#fbbf24", icon: BadgeCheck },
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

/**
 * Human-facing action label for each workflow edge, keyed `${from}->${to}`.
 * Only adjacent (±1) edges are reachable via buttons; non-adjacent ADMIN jumps
 * fall back to the target status label (see {@link getTransitionLabel}).
 */
export const TRANSITION_LABELS: Record<string, string> = {
  "DRAFT->IN_SALES_REVIEW": "Invia in revisione",
  "IN_SALES_REVIEW->DRAFT": "Rifiuta",
  "IN_SALES_REVIEW->SALES_APPROVED": "Approva",
  "SALES_APPROVED->IN_SALES_REVIEW": "Riapri vendite",
  "SALES_APPROVED->IN_REVIEW": "Prendi in revisione",
  "IN_REVIEW->SALES_APPROVED": "Rimanda a vendite",
  "IN_REVIEW->APPROVED": "Approva",
  "APPROVED->IN_REVIEW": "Riapri",
  "APPROVED->CLOSED": "Chiudi",
  "CLOSED->APPROVED": "Riapri",
};

export function getTransitionLabel(
  from: ConfigurationStatusType,
  to: ConfigurationStatusType,
): string {
  return TRANSITION_LABELS[`${from}->${to}`] ?? STATUS_CONFIG[to].label;
}
