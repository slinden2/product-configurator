import { type SurchargeKind, SurchargeKindLabels } from "@/types";
import type { OfferSurchargeItem } from "@/validation/offer-schema";

type SettingRow = { kind: string; price: string | number };

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

export function sumSurchargeTotal(surcharges: OfferSurchargeItem[]): number {
  return surcharges.reduce((sum, s) => sum + s.line_total, 0);
}

/**
 * Resolves applicable surcharges from configuration fields and DB settings.
 * Returns { ok: false } if a triggered surcharge has a missing or non-positive price,
 * so the caller can fail loudly before writing any snapshot data.
 */
export function resolveOfferSurcharges(input: {
  totalHeightMm: number | null | undefined;
  standardHeightMm: number;
  hasOmzPaint: boolean;
  settings: SettingRow[];
}): { ok: true; surcharges: OfferSurchargeItem[] } | { ok: false } {
  const heightSetting = input.settings.find((s) => s.kind === "HEIGHT");
  const paintSetting = input.settings.find((s) => s.kind === "PAINT");

  const heightWillApply =
    input.totalHeightMm != null &&
    input.totalHeightMm !== input.standardHeightMm;
  const paintWillApply = input.hasOmzPaint;

  if (heightWillApply && Number(heightSetting?.price ?? 0) <= 0) {
    return { ok: false };
  }
  if (paintWillApply && Number(paintSetting?.price ?? 0) <= 0) {
    return { ok: false };
  }

  return {
    ok: true,
    surcharges: buildAllSurcharges({
      totalHeightMm: input.totalHeightMm,
      standardHeightMm: input.standardHeightMm,
      heightAmount: Number(heightSetting?.price ?? 0),
      hasOmzPaint: input.hasOmzPaint,
      paintAmount: Number(paintSetting?.price ?? 0),
    }),
  };
}
