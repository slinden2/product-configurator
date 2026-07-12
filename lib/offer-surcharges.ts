import {
  type SettingRow,
  type SurchargeKind,
  SurchargeKindLabels,
} from "@/types";
import type { OfferSurchargeItem } from "@/validation/offer/offer-pricing-schema";

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

/**
 * Whether a height surcharge applies. Single source of truth for guard + builder.
 *
 * The `!==` is deliberate: ANY deviation from `standardHeightMm` — taller or
 * shorter — makes the machine a custom build and is surcharged as such. Do not
 * "fix" this to `>`.
 */
export function heightSurchargeApplies(input: {
  totalHeightMm: number | null | undefined;
  standardHeightMm: number;
}): boolean {
  return (
    input.totalHeightMm != null &&
    input.totalHeightMm !== input.standardHeightMm
  );
}

/** Whether a paint surcharge applies. Single source of truth for guard + builder. */
export function paintSurchargeApplies(input: {
  hasOmzPaint: boolean;
}): boolean {
  return input.hasOmzPaint;
}

export function buildHeightSurcharge(input: {
  totalHeightMm: number | null | undefined;
  standardHeightMm: number;
  amount: number;
}): OfferSurchargeItem | null {
  if (!heightSurchargeApplies(input)) return null;
  return buildSurcharge("HEIGHT", input.amount);
}

export function buildPaintSurcharge(input: {
  hasOmzPaint: boolean;
  amount: number;
}): OfferSurchargeItem | null {
  if (!paintSurchargeApplies(input)) return null;
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

  const heightWillApply = heightSurchargeApplies(input);
  const paintWillApply = paintSurchargeApplies(input);

  const heightPrice = Number(heightSetting?.price ?? 0);
  const paintPrice = Number(paintSetting?.price ?? 0);

  // Fail closed: NaN, 0, and negatives all fail `> 0`, so a malformed price
  // can never slip a NaN amount into line pricing / the snapshot. Note the HEIGHT
  // guard fires for any deviation from the standard height (above or below) —
  // see heightSurchargeApplies.
  if (heightWillApply && !(heightPrice > 0)) {
    return { ok: false };
  }
  if (paintWillApply && !(paintPrice > 0)) {
    return { ok: false };
  }

  return {
    ok: true,
    surcharges: buildAllSurcharges({
      totalHeightMm: input.totalHeightMm,
      standardHeightMm: input.standardHeightMm,
      heightAmount: heightPrice,
      hasOmzPaint: input.hasOmzPaint,
      paintAmount: paintPrice,
    }),
  };
}
