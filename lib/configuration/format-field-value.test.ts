import { describe, expect, it } from "vitest";
import type { SelectOption } from "@/types";
import {
  EMPTY_DISPLAY,
  formatBoolean,
  formatEnumValue,
  formatNumber,
  formatText,
} from "./format-field-value";

describe("formatBoolean", () => {
  it("maps true to Sì and false/undefined to No", () => {
    expect(formatBoolean(true)).toBe("Sì");
    expect(formatBoolean(false)).toBe("No");
    expect(formatBoolean(undefined)).toBe("No");
    expect(formatBoolean(null)).toBe("No");
  });
});

describe("formatEnumValue", () => {
  const options: SelectOption[] = [
    { value: "THREAD", label: "Filo" },
    { value: 2, label: "Due spazzole" },
  ];

  it("resolves a value to its Italian label", () => {
    expect(formatEnumValue("THREAD", options)).toBe("Filo");
  });

  it("matches numeric values regardless of string/number type", () => {
    expect(formatEnumValue(2, options)).toBe("Due spazzole");
    expect(formatEnumValue("2", options)).toBe("Due spazzole");
  });

  it("returns the placeholder for empty values", () => {
    expect(formatEnumValue(undefined, options)).toBe(EMPTY_DISPLAY);
    expect(formatEnumValue(null, options)).toBe(EMPTY_DISPLAY);
    expect(formatEnumValue("", options)).toBe(EMPTY_DISPLAY);
  });

  it("falls back to the raw value when no option matches", () => {
    expect(formatEnumValue("UNKNOWN", options)).toBe("UNKNOWN");
  });
});

describe("formatNumber", () => {
  it("formats numbers and appends an optional suffix", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(2500)).toBe("2500");
    expect(formatNumber(2500, "mm")).toBe("2500 mm");
  });

  it("returns the placeholder for missing/NaN values", () => {
    expect(formatNumber(undefined)).toBe(EMPTY_DISPLAY);
    expect(formatNumber(null)).toBe(EMPTY_DISPLAY);
    expect(formatNumber(Number.NaN)).toBe(EMPTY_DISPLAY);
  });
});

describe("formatText", () => {
  it("returns the placeholder for empty/whitespace text", () => {
    expect(formatText(undefined)).toBe(EMPTY_DISPLAY);
    expect(formatText("")).toBe(EMPTY_DISPLAY);
    expect(formatText("   ")).toBe(EMPTY_DISPLAY);
  });

  it("returns the text otherwise", () => {
    expect(formatText("Cliente ACME")).toBe("Cliente ACME");
  });
});
