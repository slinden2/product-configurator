import { describe, expect, it } from "vitest";
import { offerHeaderInputSchema } from "@/validation/offer/offer-schema";
import { makeDummyOffer } from "./dummy-offer";

describe("makeDummyOffer", () => {
  it("always produces an offer header that passes offerHeaderInputSchema", () => {
    for (let i = 0; i < 100; i++) {
      const offer = makeDummyOffer();
      const result = offerHeaderInputSchema.safeParse(offer);
      expect(result.error?.issues).toBeUndefined();
      expect(result.success).toBe(true);
      expect(offer.customer_name.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("exercises both empty and populated optional fields across calls", () => {
    const offers = Array.from({ length: 100 }, () => makeDummyOffer());
    expect(offers.some((o) => o.customer_email === "")).toBe(true);
    expect(offers.some((o) => o.customer_email !== "")).toBe(true);
  });
});
