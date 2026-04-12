import { isEditable } from "@/app/actions/lib/auth-checks";
import { getEngineeringBomItems, hasEngineeringBom } from "@/db/queries";
import type { Configuration, EngineeringBomItem } from "@/db/schemas";
import {
  BOM,
  type BOMItemWithCost,
  type BOMItemWithDescription,
  enrichWithCosts,
} from "@/lib/BOM";
import type { Role } from "@/types";

// ── Grouping ────────────────────────────────────────────────────────────

export interface GroupedEbomItems {
  general: EngineeringBomItem[];
  waterTanks: Map<number, EngineeringBomItem[]>;
  washBays: Map<number, EngineeringBomItem[]>;
}

export function groupEbomByCategory(
  items: EngineeringBomItem[],
): GroupedEbomItems {
  const general: EngineeringBomItem[] = [];
  const waterTanks = new Map<number, EngineeringBomItem[]>();
  const washBays = new Map<number, EngineeringBomItem[]>();

  for (const item of items) {
    switch (item.category) {
      case "GENERAL":
        general.push(item);
        break;
      case "WATER_TANK": {
        const arr = waterTanks.get(item.category_index) ?? [];
        arr.push(item);
        waterTanks.set(item.category_index, arr);
        break;
      }
      case "WASH_BAY": {
        const arr = washBays.get(item.category_index) ?? [];
        arr.push(item);
        washBays.set(item.category_index, arr);
        break;
      }
    }
  }

  return { general, waterTanks, washBays };
}

// ── Tag grouping ────────────────────────────────────────────────────────

export { groupByTag, hasTagData } from "@/lib/BOM/tag-utils";

// ── Export data builders ────────────────────────────────────────────────

export function buildEbomExportData(
  activeItems: EngineeringBomItem[],
): BOMItemWithDescription[] {
  return activeItems.map((i) => ({
    pn: i.pn,
    qty: i.qty,
    _description: "",
    description: i.description,
  }));
}

export async function buildEbomCostExportData(
  activeItems: EngineeringBomItem[],
): Promise<{
  generalBOM: BOMItemWithCost[];
  waterTankBOMs: BOMItemWithCost[][];
  washBayBOMs: BOMItemWithCost[][];
}> {
  const toBomItem = (i: EngineeringBomItem): BOMItemWithDescription => ({
    pn: i.pn,
    qty: i.qty,
    _description: "",
    description: i.description,
    tag: i.tag ?? undefined,
  });

  const { general, waterTanks, washBays } = groupEbomByCategory(activeItems);

  const generalBOM = await enrichWithCosts(general.map(toBomItem));
  const waterTankBOMs = await Promise.all(
    Array.from(waterTanks.values()).map((items) =>
      enrichWithCosts(items.map(toBomItem)),
    ),
  );
  const washBayBOMs = await Promise.all(
    Array.from(washBays.values()).map((items) =>
      enrichWithCosts(items.map(toBomItem)),
    ),
  );

  return { generalBOM, waterTankBOMs, washBayBOMs };
}

// ── Data orchestration ────────────────────────────────────────────────

export interface BOMPageData {
  clientName: string;
  description: string;
  generalBOM: BOMItemWithDescription[];
  waterTankBOMs: BOMItemWithDescription[][];
  washBayBOMs: BOMItemWithDescription[][];
  hasEbom: boolean;
  ebomItems: EngineeringBomItem[];
  activeEbomItems: EngineeringBomItem[];
  editable: boolean;
  ebomGrouped: GroupedEbomItems;
  exportData: BOMItemWithDescription[];
  exportCostsData: {
    generalBOM: BOMItemWithCost[];
    waterTankBOMs: BOMItemWithCost[][];
    washBayBOMs: BOMItemWithCost[][];
  };
  ebomCreatedAt: Date | null;
  ebomRulesVersion: string | null;
}

export async function prepareBOMPageData(
  confId: number,
  bom: BOM,
  configuration: Configuration,
  userRole: Role,
): Promise<BOMPageData> {
  const clientName = bom.getClientName();
  const description = bom.getDescription();
  const { generalBOM, waterTankBOMs, washBayBOMs } =
    await bom.buildCompleteBOM();

  const hasEbom = await hasEngineeringBom(confId);
  const ebomItems = hasEbom ? await getEngineeringBomItems(confId) : [];
  const activeEbomItems = ebomItems.filter((i) => !i.is_deleted);

  const editable = isEditable(configuration.status, userRole);
  const ebomGrouped = groupEbomByCategory(ebomItems);

  const exportData = hasEbom
    ? buildEbomExportData(activeEbomItems)
    : BOM.generateExportData(generalBOM, waterTankBOMs, washBayBOMs);

  const exportCostsData = hasEbom
    ? await buildEbomCostExportData(activeEbomItems)
    : await BOM.generateCostExportData(generalBOM, waterTankBOMs, washBayBOMs);

  const ebomCreatedAt = getEarliestCreatedAt(ebomItems);
  const ebomRulesVersion = getBomRulesVersion(ebomItems);

  return {
    clientName,
    description,
    generalBOM,
    waterTankBOMs,
    washBayBOMs,
    hasEbom,
    ebomItems,
    activeEbomItems,
    editable,
    ebomGrouped,
    exportData,
    exportCostsData,
    ebomCreatedAt,
    ebomRulesVersion,
  };
}

// ── Metadata ────────────────────────────────────────────────────────────

export function getEarliestCreatedAt(items: EngineeringBomItem[]): Date | null {
  if (items.length === 0) return null;
  return items.reduce((earliest, item) =>
    item.created_at < earliest.created_at ? item : earliest,
  ).created_at;
}

export function getBomRulesVersion(items: EngineeringBomItem[]): string | null {
  if (items.length === 0) return null;
  return items[0].bom_rules_version;
}
