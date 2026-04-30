import { type SurchargeKind, SurchargeKindLabels } from "@/types";
import type { OfferSurchargeItem } from "@/validation/offer-schema";

function buildSurcharge(
  kind: SurchargeKind,
  amount: number,
): OfferSurchargeItem {
  return {
    surcharge_kind: kind,
    description: SurchargeKindLabels[kind],
    qty: 1,
    amount,
    line_total: amount,
  };
}

export function buildHeightSurcharge(input: {
  totalHeightMm: number | null | undefined;
  standardHeightMm: number;
  amount: number;
}): OfferSurchargeItem | null {
  if (input.totalHeightMm == null) return null;
  if (input.totalHeightMm === input.standardHeightMm) return null;
  return buildSurcharge("HEIGHT", input.amount);
}

export function buildPaintSurcharge(input: {
  hasOmzPaint: boolean;
  amount: number;
}): OfferSurchargeItem | null {
  if (!input.hasOmzPaint) return null;
  return buildSurcharge("PAINT", input.amount);
}

export function buildAllSurcharges(input: {
  totalHeightMm: number | null | undefined;
  standardHeightMm: number;
  heightAmount: number;
  hasOmzPaint: boolean;
  paintAmount: number;
}): OfferSurchargeItem[] {
  return [
    buildHeightSurcharge({
      totalHeightMm: input.totalHeightMm,
      standardHeightMm: input.standardHeightMm,
      amount: input.heightAmount,
    }),
    buildPaintSurcharge({
      hasOmzPaint: input.hasOmzPaint,
      amount: input.paintAmount,
    }),
  ].filter((s): s is OfferSurchargeItem => s !== null);
}
