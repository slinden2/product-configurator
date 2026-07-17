import { describe, expect, test } from "vitest";
import { ConfigurationStatus, OfferStatus } from "@/types";
import {
  configStatusToSlug,
  offerStatusToSlug,
  parseConfigStatusSlug,
  parseOfferStatusSlug,
} from "./status-slugs";

describe("offer status slug round-trip", () => {
  test.each([...OfferStatus])("%s round-trips", (status) => {
    const slug = offerStatusToSlug(status);
    expect(slug).toBeTruthy();
    expect(parseOfferStatusSlug(slug)).toBe(status);
  });

  test("undefined input returns undefined", () => {
    expect(parseOfferStatusSlug(undefined)).toBeUndefined();
  });

  test("unknown slug returns undefined", () => {
    expect(parseOfferStatusSlug("unknown")).toBeUndefined();
  });
});

describe("config status slug round-trip", () => {
  test.each([...ConfigurationStatus])("%s round-trips", (status) => {
    const slug = configStatusToSlug(status);
    expect(slug).toBeTruthy();
    expect(parseConfigStatusSlug(slug)).toBe(status);
  });

  test("undefined input returns undefined", () => {
    expect(parseConfigStatusSlug(undefined)).toBeUndefined();
  });

  test("unknown slug returns undefined", () => {
    expect(parseConfigStatusSlug("unknown")).toBeUndefined();
  });
});
