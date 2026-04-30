// @vitest-environment node
import { describe, expect, test } from "vitest";

import {
  buildAllSurcharges,
  buildHeightSurcharge,
  buildPaintSurcharge,
} from "@/lib/offer-surcharges";
import { SurchargeKindLabels } from "@/types";
import { offerSurchargeItemSchema } from "@/validation/offer-schema";

describe("buildHeightSurcharge", () => {
  test("returns null when totalHeightMm is null", () => {
    expect(
      buildHeightSurcharge({
        totalHeightMm: null,
        standardHeightMm: 4000,
        amount: 1500,
      }),
    ).toBeNull();
  });

  test("returns null when totalHeightMm is undefined", () => {
    expect(
      buildHeightSurcharge({
        totalHeightMm: undefined,
        standardHeightMm: 4000,
        amount: 1500,
      }),
    ).toBeNull();
  });

  test("returns null when totalHeightMm equals standardHeightMm", () => {
    expect(
      buildHeightSurcharge({
        totalHeightMm: 4000,
        standardHeightMm: 4000,
        amount: 1500,
      }),
    ).toBeNull();
  });

  test("returns HEIGHT surcharge when totalHeightMm differs from standard", () => {
    const result = buildHeightSurcharge({
      totalHeightMm: 4500,
      standardHeightMm: 4000,
      amount: 1500,
    });
    expect(result).not.toBeNull();
    expect(result?.surcharge_kind).toBe("HEIGHT");
    expect(result?.description).toBe(SurchargeKindLabels.HEIGHT);
    expect(result?.qty).toBe(1);
    expect(result?.amount).toBe(1500);
    expect(result?.line_total).toBe(1500);
  });

  test("returns HEIGHT surcharge for below-standard height", () => {
    const result = buildHeightSurcharge({
      totalHeightMm: 3500,
      standardHeightMm: 4000,
      amount: 800,
    });
    expect(result?.surcharge_kind).toBe("HEIGHT");
    expect(result?.amount).toBe(800);
  });

  test("schema roundtrip: built item passes offerSurchargeItemSchema.parse", () => {
    const item = buildHeightSurcharge({
      totalHeightMm: 5000,
      standardHeightMm: 4000,
      amount: 2000,
    });
    expect(() => offerSurchargeItemSchema.parse(item)).not.toThrow();
  });
});

describe("buildPaintSurcharge", () => {
  test("returns null when hasOmzPaint is false", () => {
    expect(
      buildPaintSurcharge({ hasOmzPaint: false, amount: 1200 }),
    ).toBeNull();
  });

  test("returns PAINT surcharge when hasOmzPaint is true", () => {
    const result = buildPaintSurcharge({ hasOmzPaint: true, amount: 1200 });
    expect(result).not.toBeNull();
    expect(result?.surcharge_kind).toBe("PAINT");
    expect(result?.description).toBe(SurchargeKindLabels.PAINT);
    expect(result?.qty).toBe(1);
    expect(result?.amount).toBe(1200);
    expect(result?.line_total).toBe(1200);
  });

  test("schema roundtrip: built item passes offerSurchargeItemSchema.parse", () => {
    const item = buildPaintSurcharge({ hasOmzPaint: true, amount: 1200 });
    expect(() => offerSurchargeItemSchema.parse(item)).not.toThrow();
  });
});

describe("buildAllSurcharges", () => {
  const base = {
    standardHeightMm: 4000,
    heightAmount: 1500,
    paintAmount: 1200,
  };

  test("returns empty array when neither surcharge applies", () => {
    const result = buildAllSurcharges({
      ...base,
      totalHeightMm: 4000,
      hasOmzPaint: false,
    });
    expect(result).toHaveLength(0);
  });

  test("returns only HEIGHT when height differs and no paint", () => {
    const result = buildAllSurcharges({
      ...base,
      totalHeightMm: 4500,
      hasOmzPaint: false,
    });
    expect(result).toHaveLength(1);
    expect(result[0].surcharge_kind).toBe("HEIGHT");
  });

  test("returns only PAINT when height is standard and paint is requested", () => {
    const result = buildAllSurcharges({
      ...base,
      totalHeightMm: 4000,
      hasOmzPaint: true,
    });
    expect(result).toHaveLength(1);
    expect(result[0].surcharge_kind).toBe("PAINT");
  });

  test("returns [HEIGHT, PAINT] in order when both apply", () => {
    const result = buildAllSurcharges({
      ...base,
      totalHeightMm: 4500,
      hasOmzPaint: true,
    });
    expect(result).toHaveLength(2);
    expect(result[0].surcharge_kind).toBe("HEIGHT");
    expect(result[1].surcharge_kind).toBe("PAINT");
  });

  test("returns only PAINT when totalHeightMm is null and paint is requested", () => {
    const result = buildAllSurcharges({
      ...base,
      totalHeightMm: null,
      hasOmzPaint: true,
    });
    expect(result).toHaveLength(1);
    expect(result[0].surcharge_kind).toBe("PAINT");
  });

  test("returns correct amounts for each surcharge", () => {
    const result = buildAllSurcharges({
      ...base,
      totalHeightMm: 4500,
      hasOmzPaint: true,
    });
    expect(result[0].amount).toBe(1500);
    expect(result[1].amount).toBe(1200);
  });
});
