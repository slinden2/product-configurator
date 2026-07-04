import { describe, expect, it } from "vitest";
import {
  hasQualifyingEnergyChainBay,
  violatesEnergyChainInvariant,
} from "./energy-chain";

describe("hasQualifyingEnergyChainBay", () => {
  it("returns true when at least one bay has gantry and width", () => {
    expect(
      hasQualifyingEnergyChainBay([
        { has_gantry: false, energy_chain_width: null },
        { has_gantry: true, energy_chain_width: "L200" },
      ]),
    ).toBe(true);
  });

  it("returns false for a bay with gantry but no width", () => {
    expect(
      hasQualifyingEnergyChainBay([
        { has_gantry: true, energy_chain_width: null },
      ]),
    ).toBe(false);
  });

  it("returns false for a bay with width but no gantry", () => {
    expect(
      hasQualifyingEnergyChainBay([
        { has_gantry: false, energy_chain_width: "L150" },
      ]),
    ).toBe(false);
  });

  it("returns false for an empty bay list", () => {
    expect(hasQualifyingEnergyChainBay([])).toBe(false);
  });

  it("treats undefined width like null", () => {
    expect(
      hasQualifyingEnergyChainBay([
        { has_gantry: true, energy_chain_width: undefined },
      ]),
    ).toBe(false);
    expect(hasQualifyingEnergyChainBay([{ has_gantry: true }])).toBe(false);
  });
});

describe("violatesEnergyChainInvariant", () => {
  it("flags an ENERGY_CHAIN config without a qualifying bay", () => {
    expect(violatesEnergyChainInvariant("ENERGY_CHAIN", [])).toBe(true);
    expect(
      violatesEnergyChainInvariant("ENERGY_CHAIN", [
        { has_gantry: true, energy_chain_width: null },
      ]),
    ).toBe(true);
  });

  it("passes an ENERGY_CHAIN config with a qualifying bay", () => {
    expect(
      violatesEnergyChainInvariant("ENERGY_CHAIN", [
        { has_gantry: true, energy_chain_width: "L250" },
      ]),
    ).toBe(false);
  });

  it("never flags non-ENERGY_CHAIN supply types", () => {
    expect(violatesEnergyChainInvariant("STRAIGHT_SHELF", [])).toBe(false);
    expect(violatesEnergyChainInvariant("BOOM", [])).toBe(false);
  });

  it("never flags a missing supply type", () => {
    expect(violatesEnergyChainInvariant(null, [])).toBe(false);
    expect(violatesEnergyChainInvariant(undefined, [])).toBe(false);
  });
});
