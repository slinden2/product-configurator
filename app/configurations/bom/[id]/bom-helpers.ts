import { EngineeringBomItem } from "@/db/schemas";
import { getPartNumbersByArray } from "@/db/queries";
import { BOMItemWithCost, BOMItemWithDescription } from "@/lib/BOM";

// ── Grouping ────────────────────────────────────────────────────────────

export interface GroupedEbomItems {
  general: EngineeringBomItem[];
  waterTanks: Map<number, EngineeringBomItem[]>;
  washBays: Map<number, EngineeringBomItem[]>;
}

export function groupEbomByCategory(
  items: EngineeringBomItem[]
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

// ── Export data builders ────────────────────────────────────────────────

export function buildEbomExportData(
  activeItems: EngineeringBomItem[]
): BOMItemWithDescription[] {
  return activeItems.map((i) => ({
    pn: i.pn,
    qty: i.qty,
    _description: "",
    description: i.description,
  }));
}

export async function buildEbomCostExportData(
  activeItems: EngineeringBomItem[]
): Promise<{
  generalBOM: BOMItemWithCost[];
  waterTankBOMs: BOMItemWithCost[][];
  washBayBOMs: BOMItemWithCost[][];
}> {
  const uniquePns = [...new Set(activeItems.map((i) => i.pn))];
  const pnData = await getPartNumbersByArray(uniquePns);
  const costMap = new Map(pnData.map((p) => [p.pn, Number(p.cost) || 0]));

  const addCost = (i: EngineeringBomItem): BOMItemWithCost => ({
    pn: i.pn,
    qty: i.qty,
    _description: "",
    description: i.description,
    cost: costMap.get(i.pn) ?? 0,
  });

  const { general, waterTanks, washBays } = groupEbomByCategory(activeItems);

  return {
    generalBOM: general.map(addCost),
    waterTankBOMs: Array.from(waterTanks.values()).map((items) =>
      items.map(addCost)
    ),
    washBayBOMs: Array.from(washBays.values()).map((items) =>
      items.map(addCost)
    ),
  };
}

// ── Timestamp ───────────────────────────────────────────────────────────

export function getEarliestCreatedAt(
  items: EngineeringBomItem[]
): Date | null {
  if (items.length === 0) return null;
  return items.reduce((earliest, item) =>
    item.created_at < earliest.created_at ? item : earliest
  ).created_at;
}
