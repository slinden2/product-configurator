import { ConfigurationStatusType } from "@/types";

export const STATUS_CONFIG: Record<
  ConfigurationStatusType,
  { label: string; bgClass: string }
> = {
  DRAFT: { label: "Bozza", bgClass: "bg-slate-400" },
  SUBMITTED: { label: "Inviato", bgClass: "bg-green-400" },
  IN_REVIEW: { label: "In Revisione", bgClass: "bg-blue-400" },
  APPROVED: { label: "Approvato", bgClass: "bg-amber-400" },
  CLOSED: { label: "Chiuso", bgClass: "bg-rose-400" },
};
