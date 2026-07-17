import type { ConfigurationStatusType, OfferStatusType } from "@/types";

const OFFER_STATUS_TO_SLUG: Record<OfferStatusType, string> = {
  DRAFT: "bozza",
  PENDING_APPROVAL: "in-approvazione",
  APPROVED_TO_SEND: "approvata-per-invio",
  SENT: "inviata",
  ACCEPTED: "accettata",
  REJECTED: "rifiutata",
  EXPIRED: "scaduta",
};

const OFFER_SLUG_TO_STATUS = Object.fromEntries(
  Object.entries(OFFER_STATUS_TO_SLUG).map(([k, v]) => [v, k]),
) as Record<string, OfferStatusType>;

export function offerStatusToSlug(status: OfferStatusType): string {
  return OFFER_STATUS_TO_SLUG[status];
}

export function parseOfferStatusSlug(
  slug: string | undefined,
): OfferStatusType | undefined {
  if (!slug) return undefined;
  return OFFER_SLUG_TO_STATUS[slug];
}

const CONFIG_STATUS_TO_SLUG: Record<ConfigurationStatusType, string> = {
  DRAFT: "bozza",
  SALES_APPROVED: "approvato-vendite",
  IN_TECH_REVIEW: "in-revisione-tecnica",
  TECH_APPROVED: "approvato-tecnico",
  CLOSED: "chiuso",
};

const CONFIG_SLUG_TO_STATUS = Object.fromEntries(
  Object.entries(CONFIG_STATUS_TO_SLUG).map(([k, v]) => [v, k]),
) as Record<string, ConfigurationStatusType>;

export function configStatusToSlug(status: ConfigurationStatusType): string {
  return CONFIG_STATUS_TO_SLUG[status];
}

export function parseConfigStatusSlug(
  slug: string | undefined,
): ConfigurationStatusType | undefined {
  if (!slug) return undefined;
  return CONFIG_SLUG_TO_STATUS[slug];
}
