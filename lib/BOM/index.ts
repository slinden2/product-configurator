import { getPartNumbersByArray } from "@/db/queries";
import {
  Configuration,
  ConfigurationWithWaterTanksAndWashBays,
  WashBay,
} from "@/db/schemas";
import {
  GeneralMaxBOM,
  MaxBOMItem,
  WashBayMaxBOM,
  WaterTankMaxBOM,
} from "@/lib/BOM/max-bom";
import { BomTag } from "@/types";

export interface BOMItem {
  pn: string;
  qty: number;
  _description: string;
  tag?: BomTag;
}

export interface WithBOMItems {
  bomItems: BOMItem[];
}

export interface BOMItemWithDescription extends BOMItem {
  description: string;
}

export interface BOMItemWithCost extends BOMItemWithDescription {
  cost: number;
}

export type WithSupplyData = Pick<
  Configuration,
  "supply_side" | "supply_type" | "supply_fixing_type"
> & {
  uses_3000_posts: boolean;
};

export type GeneralBOMConfig = Configuration & { has_shelf_extension: boolean };

/** Enrich BOM items with cost data from the DB. Shared by BOM class and bom-helpers. */
export async function enrichWithCosts<
  T extends { pn: string },
>(
  items: T[],
): Promise<(T & { cost: number })[]> {
  const uniquePns = [...new Set(items.map((i) => i.pn))];
  if (uniquePns.length === 0) return items.map((i) => ({ ...i, cost: 0 }));

  const pnData = await getPartNumbersByArray(uniquePns);
  const costMap = new Map(pnData.map((p) => [p.pn, Number(p.cost) || 0]));

  return items.map((item) => ({
    ...item,
    cost: costMap.get(item.pn) ?? 0,
  }));
}

export class BOM {
  configuration: ConfigurationWithWaterTanksAndWashBays;
  generalMaxBOM = GeneralMaxBOM;
  waterTankMaxBOM = WaterTankMaxBOM;
  washBayMaxBOM = WashBayMaxBOM;

  private constructor(configuration: ConfigurationWithWaterTanksAndWashBays) {
    this.configuration = configuration;
  }

  static init(configuration: ConfigurationWithWaterTanksAndWashBays): BOM {
    return new BOM(configuration);
  }

  async buildCompleteBOM(): Promise<{
    generalBOM: BOMItemWithDescription[];
    waterTankBOMs: BOMItemWithDescription[][];
    washBayBOMs: BOMItemWithDescription[][];
  }> {
    // Phase 1: filter rules and resolve quantities (no DB calls)
    const generalFiltered = this._filterAndResolve(
      this.generalMaxBOM,
      this._buildGeneralConfig(),
    );
    const waterTankFiltered = this.configuration.water_tanks.map((wt) =>
      this._filterAndResolve(this.waterTankMaxBOM, wt),
    );
    const washBayFiltered = this._filterWashBays();

    // Phase 2: single batch DB call for all part number descriptions
    const allItems = [
      ...generalFiltered,
      ...waterTankFiltered.flat(),
      ...washBayFiltered.flat(),
    ];
    const descriptionMap = await this._fetchDescriptions(allItems);

    // Phase 3: attach descriptions
    const generalBOM = this._attachDescriptions(generalFiltered, descriptionMap);
    const waterTankBOMs = waterTankFiltered.map((items) =>
      this._attachDescriptions(items, descriptionMap),
    );
    const washBayBOMs = washBayFiltered.map((items) =>
      this._attachDescriptions(items, descriptionMap),
    );

    return { generalBOM, waterTankBOMs, washBayBOMs };
  }

  async buildGeneralBOM(): Promise<BOMItemWithDescription[]> {
    const filtered = this._filterAndResolve(
      this.generalMaxBOM,
      this._buildGeneralConfig(),
    );
    const descriptionMap = await this._fetchDescriptions(filtered);
    return this._attachDescriptions(filtered, descriptionMap);
  }

  async buildWaterTankBOM(): Promise<BOMItemWithDescription[][]> {
    return await Promise.all(
      this.configuration.water_tanks.map(async (waterTank) => {
        const filtered = this._filterAndResolve(this.waterTankMaxBOM, waterTank);
        const descriptionMap = await this._fetchDescriptions(filtered);
        return this._attachDescriptions(filtered, descriptionMap);
      }),
    );
  }

  async buildWashBayBOM(): Promise<BOMItemWithDescription[][]> {
    const washBayFiltered = this._filterWashBays();
    return await Promise.all(
      washBayFiltered.map(async (items) => {
        const descriptionMap = await this._fetchDescriptions(items);
        return this._attachDescriptions(items, descriptionMap);
      }),
    );
  }

  private _buildGeneralConfig(): GeneralBOMConfig {
    const has_shelf_extension = this.configuration.wash_bays.some(
      (wb) => wb.has_gantry && wb.has_shelf_extension,
    );
    return { ...this.configuration, has_shelf_extension };
  }

  private _generateWashBayObjectWithSupplyData(
    washBay: WashBay,
    opts: { uses3000posts: boolean },
  ): WashBay & WithSupplyData {
    const { uses3000posts } = opts;
    return {
      ...washBay,
      supply_side: this.configuration.supply_side,
      supply_type: this.configuration.supply_type,
      supply_fixing_type: this.configuration.supply_fixing_type,
      uses_3000_posts: uses3000posts,
    };
  }

  private _filterWashBays(): BOMItem[][] {
    const uses3000posts = this.configuration.wash_bays.some(
      (washBay) => washBay.hp_lance_qty + washBay.det_lance_qty > 2,
    );

    return this.configuration.wash_bays.map((washBay) => {
      const washBayWithSupplyData = this._generateWashBayObjectWithSupplyData(
        washBay,
        { uses3000posts },
      );
      return this._filterAndResolve(this.washBayMaxBOM, washBayWithSupplyData);
    });
  }

  /** Filter max BOM by conditions and resolve quantities. Pure, no DB calls. */
  private _filterAndResolve<T>(
    maxBOM: MaxBOMItem<T>[],
    configuration: T,
  ): BOMItem[] {
    return maxBOM
      .filter((item) =>
        item.conditions.every((conditionFn) => conditionFn(configuration)),
      )
      .map((item) => ({
        pn: item.pn,
        qty:
          typeof item.qty === "function" ? item.qty(configuration) : item.qty,
        _description: item._description,
        tag: item.tag,
      }));
  }

  /** Fetch descriptions for a list of BOM items from the DB. */
  private async _fetchDescriptions(
    items: BOMItem[],
  ): Promise<Map<string, string>> {
    const pns = [...new Set(items.map((item) => item.pn))];
    if (pns.length === 0) return new Map();

    const pnData = await getPartNumbersByArray(pns);
    const map = new Map(pnData.map((p) => [p.pn, p.description]));

    // Warn about part numbers missing from the DB (likely typos in rule files)
    const missingPns = pns.filter((pn) => !map.has(pn));
    if (missingPns.length > 0) {
      console.warn(
        `[BOM] Part numbers not found in DB: ${missingPns.join(", ")}`,
      );
    }

    return map;
  }

  /** Attach descriptions from a pre-fetched map to filtered BOM items. */
  private _attachDescriptions(
    items: BOMItem[],
    descriptionMap: Map<string, string>,
  ): BOMItemWithDescription[] {
    return items.map((item) => ({
      ...item,
      description: descriptionMap.get(item.pn) || "N/A",
    }));
  }

  getConfiguration() {
    return this.configuration;
  }

  getClientName() {
    return this.configuration.name;
  }

  getDescription() {
    return this.configuration.description;
  }

  static generateExportData(
    generalBOM: BOMItemWithDescription[],
    waterTankBOMs: BOMItemWithDescription[][],
    washBayBOMs: BOMItemWithDescription[][],
  ): BOMItemWithDescription[] {
    return [...generalBOM, ...waterTankBOMs.flat(), ...washBayBOMs.flat()];
  }

  static async generateCostExportData(
    generalBOM: BOMItemWithDescription[],
    waterTankBOMs: BOMItemWithDescription[][],
    washBayBOMs: BOMItemWithDescription[][],
  ): Promise<{
    generalBOM: BOMItemWithCost[];
    waterTankBOMs: BOMItemWithCost[][];
    washBayBOMs: BOMItemWithCost[][];
  }> {
    const allItems = [
      ...generalBOM,
      ...waterTankBOMs.flat(),
      ...washBayBOMs.flat(),
    ];
    const enriched = await enrichWithCosts(allItems);

    // Reconstruct the original structure from the flat enriched array
    let offset = 0;
    const generalEnd = offset + generalBOM.length;
    const generalBOMWithCost = enriched.slice(offset, generalEnd);
    offset = generalEnd;

    const waterTankBOMsWithCost = waterTankBOMs.map((innerArray) => {
      const end = offset + innerArray.length;
      const slice = enriched.slice(offset, end);
      offset = end;
      return slice;
    });

    const washBayBOMsWithCost = washBayBOMs.map((innerArray) => {
      const end = offset + innerArray.length;
      const slice = enriched.slice(offset, end);
      offset = end;
      return slice;
    });

    return {
      generalBOM: generalBOMWithCost,
      waterTankBOMs: waterTankBOMsWithCost,
      washBayBOMs: washBayBOMsWithCost,
    };
  }
}
