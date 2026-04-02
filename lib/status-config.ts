import type { ConfigurationStatusType } from "@/types";

export const STATUS_CONFIG: Record<
  ConfigurationStatusType,
  { label: string; color: string }
> = {
  DRAFT: { label: "Bozza", color: "#94a3b8" },
  SUBMITTED: { label: "Inviato", color: "#4ade80" },
  IN_REVIEW: { label: "In revisione", color: "#60a5fa" },
  APPROVED: { label: "Approvato", color: "#fbbf24" },
  CLOSED: { label: "Chiuso", color: "#fb7185" },
};
