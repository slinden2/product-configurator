"use server";
import {
  deleteWashBay,
  getWashBayById,
  getWashBaysByConfigId,
  insertWashBay,
  updateWashBay,
} from "@/db/queries";
import type { Configuration } from "@/db/schemas";
import {
  type EnergyChainBayShape,
  hasQualifyingEnergyChainBay,
} from "@/lib/configuration/energy-chain";
import { MSG } from "@/lib/messages";
import { washBaySchema } from "@/validation/wash-bay-schema";
import { handleSubRecordAction } from "./lib/sub-record-actions";

type BayRow = Awaited<ReturnType<typeof getWashBaysByConfigId>>[number];

/**
 * Rejects a wash bay mutation that would take an ENERGY_CHAIN configuration
 * from satisfied to violated (zero bays with gantry + chain width). A config
 * already in violation stays editable — the workflow gates own persistent
 * violations, and blocking here would trap users mid-fix.
 */
async function energyChainGuard(
  configuration: Configuration,
  simulate: (bays: BayRow[]) => EnergyChainBayShape[],
): Promise<string | null> {
  if (configuration.supply_type !== "ENERGY_CHAIN") return null;
  const bays = await getWashBaysByConfigId(configuration.id);
  if (!hasQualifyingEnergyChainBay(bays)) return null;
  return hasQualifyingEnergyChainBay(simulate(bays))
    ? null
    : MSG.config.energyChainBayGuard;
}

export const insertWashBayAction = async (
  confId: number,
  formData: unknown,
) => {
  return handleSubRecordAction({
    actionType: "insert",
    parentId: confId,
    formData: formData,
    schema: washBaySchema,
    queryFn: insertWashBay,
    entityName: "Pista",
    auditEntity: "wash_bay",
  });
};

export const editWashBayAction = async (
  confId: number,
  washBayId: number,
  formData: unknown,
) => {
  return handleSubRecordAction({
    actionType: "edit",
    parentId: confId,
    recordId: washBayId,
    formData: formData,
    schema: washBaySchema,
    queryFn: updateWashBay,
    entityName: "Pista",
    auditEntity: "wash_bay",
    auditAction: "WASH_BAY_EDIT",
    auditSnapshot: getWashBayById,
    guard: (configuration, data) =>
      energyChainGuard(configuration, (bays) =>
        bays.map((b) =>
          b.id === washBayId
            ? {
                has_gantry: data.has_gantry,
                energy_chain_width: data.energy_chain_width ?? null,
              }
            : b,
        ),
      ),
  });
};

export const deleteWashBayAction = async (
  confId: number,
  washBayId: number,
) => {
  return handleSubRecordAction({
    actionType: "delete",
    parentId: confId,
    recordId: washBayId,
    queryFn: deleteWashBay,
    entityName: "Pista",
    auditEntity: "wash_bay",
    auditAction: "WASH_BAY_DELETE",
    auditSnapshot: getWashBayById,
    guard: (configuration) =>
      energyChainGuard(configuration, (bays) =>
        bays.filter((b) => b.id !== washBayId),
      ),
  });
};
