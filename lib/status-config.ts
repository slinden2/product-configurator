import {
  BadgeCheck,
  Eye,
  FilePen,
  Lock,
  type LucideIcon,
  Send,
} from "lucide-react";
import type { ConfigurationStatusType } from "@/types";

export const STATUS_CONFIG: Record<
  ConfigurationStatusType,
  { label: string; color: string; icon: LucideIcon }
> = {
  DRAFT: { label: "Bozza", color: "#94a3b8", icon: FilePen },
  SUBMITTED: { label: "Inviato", color: "#4ade80", icon: Send },
  IN_REVIEW: { label: "In revisione", color: "#60a5fa", icon: Eye },
  APPROVED: { label: "Approvato", color: "#fbbf24", icon: BadgeCheck },
  CLOSED: { label: "Chiuso", color: "#fb7185", icon: Lock },
};

/**
 * Linear order of the workflow pipeline. A transition's direction is derived by
 * comparing the two statuses' indices here: a higher target index is "forward".
 */
export const STATUS_PIPELINE: ConfigurationStatusType[] = [
  "DRAFT",
  "SUBMITTED",
  "IN_REVIEW",
  "APPROVED",
  "CLOSED",
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
  "DRAFT->SUBMITTED": "Invia",
  "SUBMITTED->DRAFT": "Riporta in bozza",
  "SUBMITTED->IN_REVIEW": "Prendi in revisione",
  "IN_REVIEW->SUBMITTED": "Rimanda",
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
