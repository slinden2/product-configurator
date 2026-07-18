import { isEditable } from "@/app/actions/lib/auth-checks";
import {
  type EngineeringBomItemWithPart,
  getEngineeringBomItems,
  hasEngineeringBom,
  offerRevisionStatusFor,
} from "@/db/queries";
import {
  BOM,
  type BOMItemWithCost,
  type BOMItemWithDescription,
  enrichWithCosts,
} from "@/lib/BOM";
import type { Role } from "@/types";

// ── Grouping ────────────────────────────────────────────────────────────

export interface GroupedEbomItems {
  general: EngineeringBomItemWithPart[];
  waterTanks: Map<number, EngineeringBomItemWithPart[]>;
  washBays: Map<number, EngineeringBomItemWithPart[]>;
}

export function groupEbomByCategory(
  items: EngineeringBomItemWithPart[],
): GroupedEbomItems {
  const general: EngineeringBomItemWithPart[] = [];
  const waterTanks = new Map<number, EngineeringBomItemWithPart[]>();
  const washBays = new Map<number, EngineeringBomItemWithPart[]>();

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

// ── Export data builders ────────────────────────────────────────────────

export function buildEbomExportData(
  activeItems: EngineeringBomItemWithPart[],
): BOMItemWithDescription[] {
  return activeItems.map((i) => ({
    pn: i.pn,
    qty: i.qty,
    _description: "",
    description: i.description,
  }));
}

export async function buildEbomCostExportData(
  activeItems: EngineeringBomItemWithPart[],
): Promise<{
  generalBOM: BOMItemWithCost[];
  waterTankBOMs: BOMItemWithCost[][];
  washBayBOMs: BOMItemWithCost[][];
}> {
  const toBomItem = (
    i: EngineeringBomItemWithPart,
  ): BOMItemWithDescription => ({
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

export interface BomCostExportData {
  generalBOM: BOMItemWithCost[];
  waterTankBOMs: BOMItemWithCost[][];
  washBayBOMs: BOMItemWithCost[][];
}

/**
 * Builds the enriched cost-export BOM on the same EBOM-vs-generated basis the BOM
 * page renders (EBOM snapshot when one exists, else the freshly generated BOM).
 * Extracted from `prepareBOMPageData` so the costs export can build it on demand
 * (`buildBomCostExportAction`) instead of on every page view — `enrichWithCosts`
 * runs DB part-number cost lookups the page itself never needs.
 */
export async function buildBomCostExportData(
  bom: BOM,
  confId: number,
): Promise<BomCostExportData> {
  if (await hasEngineeringBom(confId)) {
    const ebomItems = await getEngineeringBomItems(confId);
    return buildEbomCostExportData(ebomItems.filter((i) => !i.is_deleted));
  }
  const { generalBOM, waterTankBOMs, washBayBOMs } =
    await bom.buildCompleteBOM();
  return BOM.generateCostExportData(generalBOM, waterTankBOMs, washBayBOMs);
}

// ── Data orchestration ────────────────────────────────────────────────

export interface BOMPageData {
  clientName: string;
  description: string;
  generalBOM: BOMItemWithDescription[];
  waterTankBOMs: BOMItemWithDescription[][];
  washBayBOMs: BOMItemWithDescription[][];
  hasEbom: boolean;
  editable: boolean;
  ebomGrouped: GroupedEbomItems;
  exportData: BOMItemWithDescription[];
  ebomCreatedAt: Date | null;
  ebomRulesVersion: string | null;
}

export async function prepareBOMPageData(
  confId: number,
  bom: BOM,
  userRole: Role,
): Promise<BOMPageData> {
  // Read the scoped configuration the BOM already holds (fetched inside getBOM
  // via getConfigurationWithTanksAndBays) — never a second, unscoped fetch.
  const { configuration } = bom;
  const clientName = bom.getClientName();
  const description = bom.getDescription();
  const [
    { generalBOM, waterTankBOMs, washBayBOMs },
    hasEbom,
    offerRevisionStatus,
  ] = await Promise.all([
    bom.buildCompleteBOM(),
    hasEngineeringBom(confId),
    offerRevisionStatusFor(configuration),
  ]);
  const ebomItems = hasEbom ? await getEngineeringBomItems(confId) : [];
  const activeEbomItems = ebomItems.filter((i) => !i.is_deleted);

  const editable = isEditable(
    configuration.status,
    userRole,
    configuration.origin,
    offerRevisionStatus,
  );
  const ebomGrouped = groupEbomByCategory(ebomItems);

  const exportData = hasEbom
    ? buildEbomExportData(activeEbomItems)
    : BOM.generateExportData(generalBOM, waterTankBOMs, washBayBOMs);

  const ebomCreatedAt = getEarliestCreatedAt(ebomItems);
  const ebomRulesVersion = getBomRulesVersion(ebomItems);

  return {
    clientName,
    description,
    generalBOM,
    waterTankBOMs,
    washBayBOMs,
    hasEbom,
    editable,
    ebomGrouped,
    exportData,
    ebomCreatedAt,
    ebomRulesVersion,
  };
}

// ── Metadata ────────────────────────────────────────────────────────────

export function getEarliestCreatedAt(
  items: EngineeringBomItemWithPart[],
): Date | null {
  if (items.length === 0) return null;
  return items.reduce((earliest, item) =>
    item.created_at < earliest.created_at ? item : earliest,
  ).created_at;
}

export function getBomRulesVersion(
  items: EngineeringBomItemWithPart[],
): string | null {
  if (items.length === 0) return null;
  return items[0].bom_rules_version;
}
