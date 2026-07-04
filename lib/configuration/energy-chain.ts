import type { SupplyType } from "@/types";

/**
 * Minimal bay shape for the ENERGY_CHAIN invariant. Accepts both DB rows
 * (energy_chain_width: enum | null) and client/Zod bays (optional field).
 */
export interface EnergyChainBayShape {
  has_gantry: boolean;
  energy_chain_width?: string | null;
}

/** True when at least one bay has a gantry AND a configured energy chain width. */
export function hasQualifyingEnergyChainBay(
  bays: readonly EnergyChainBayShape[],
): boolean {
  return bays.some((wb) => wb.has_gantry && wb.energy_chain_width != null);
}

/**
 * Cross-entity invariant: an ENERGY_CHAIN configuration must have at least one
 * qualifying bay (gantry + chain width). Non-ENERGY_CHAIN supply types never
 * violate.
 */
export function violatesEnergyChainInvariant(
  supplyType: SupplyType | string | null | undefined,
  bays: readonly EnergyChainBayShape[],
): boolean {
  return supplyType === "ENERGY_CHAIN" && !hasQualifyingEnergyChainBay(bays);
}
