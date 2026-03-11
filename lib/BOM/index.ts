import { db } from "@/db";
import { getPartNumbersByArray } from "@/db/queries";
import {
  Configuration,
  ConfigurationWithWaterTanksAndWashBays,
  partNumbers,
  WashBay,
} from "@/db/schemas";
import {
  GeneralMaxBOM,
  MaxBOMItem,
  WashBayMaxBOM,
  WaterTankMaxBOM,
} from "@/lib/BOM/max-bom";
import { inArray } from "drizzle-orm";

export interface BOMItem {
  pn: string;
  qty: number;
  _description: string;
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
    const waterTankBOMs = await this.buildWaterTankBOM();
    const washBayBOMs = await this.buildWashBayBOM();
    const generalBOM = await this.buildGeneralBOM();

    return { generalBOM, waterTankBOMs, washBayBOMs };
  }

  async buildGeneralBOM(
    washBayBOM: BOMItemWithDescription[] = []
  ): Promise<BOMItemWithDescription[]> {
    // Derive has_shelf_extension from the wash bays that have a gantry
    const has_shelf_extension = this.configuration.wash_bays.some(
      (wb) => wb.has_gantry && wb.has_shelf_extension
    );
    const augmentedConfig: GeneralBOMConfig = {
      ...this.configuration,
      has_shelf_extension,
    };

    const bom = [
      ...(await this._buildBOM<GeneralBOMConfig>(
        this.generalMaxBOM as MaxBOMItem<GeneralBOMConfig>[],
        augmentedConfig
      )),
      ...washBayBOM,
    ];

    return bom;
  }

  async buildWaterTankBOM(): Promise<BOMItemWithDescription[][]> {
    return await Promise.all(
      this.configuration.water_tanks.map(
        async (waterTank) =>
          await this._buildBOM(this.waterTankMaxBOM, waterTank)
      )
    );
  }

  private _generateWashBayObjectWithSupplyData(
    washBay: WashBay,
    opts: { uses3000posts: boolean }
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

  async buildWashBayBOM(): Promise<BOMItemWithDescription[][]> {
    const uses3000posts = this.configuration.wash_bays.some((washBay) => {
      return washBay.hp_lance_qty + washBay.det_lance_qty > 2;
    });

    return await Promise.all(
      this.configuration.wash_bays.map(async (washBay) => {
        const washBayWithSupplyData: WashBay & WithSupplyData =
          this._generateWashBayObjectWithSupplyData(washBay, {
            uses3000posts,
          });

        return await this._buildBOM(this.washBayMaxBOM, washBayWithSupplyData);
      })
    );
  }

  private async _buildBOM<T>(
    maxBOM: MaxBOMItem<T>[],
    configuration: T
  ): Promise<BOMItemWithDescription[]> {
    const filteredBOMItems = maxBOM.filter((item) =>
      item.conditions.every((conditionFn) => conditionFn(configuration))
    );

    const pns = filteredBOMItems.map((item) => item.pn);
    const pnData = await db.query.partNumbers.findMany({
      where: inArray(partNumbers.pn, pns),
    });

    return await Promise.all(
      filteredBOMItems.map(async (item) => {
        return {
          pn: item.pn,
          qty:
            typeof item.qty === "function" ? item.qty(configuration) : item.qty,
          _description: item._description,
          description:
            pnData.find((pn) => pn.pn === item.pn)?.description || "N/A",
        };
      })
    );
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

  generateExportData(
    generalBOM: BOMItemWithDescription[],
    waterTankBOMs: BOMItemWithDescription[][],
    washBayBOMs: BOMItemWithDescription[][]
  ): BOMItemWithDescription[] {
    return [...generalBOM, ...waterTankBOMs.flat(), ...washBayBOMs.flat()];
  }

  async generateCostExportData(generalBOM: BOMItemWithDescription[],
    waterTankBOMs: BOMItemWithDescription[][],
    washBayBOMs: BOMItemWithDescription[][]): Promise<{
      generalBOM: BOMItemWithCost[];
      waterTankBOMs: BOMItemWithCost[][];
      washBayBOMs: BOMItemWithCost[][];
    }> {

    const uniquePartNumbers = [...new Set([
      ...generalBOM.map(item => item.pn),
      ...waterTankBOMs.flat().map(item => item.pn),
      ...washBayBOMs.flat().map(item => item.pn)
    ])]

    const partNumbers = await getPartNumbersByArray(uniquePartNumbers);

    const pnToCostMap = new Map<string, string>();
    partNumbers.forEach(row => {
      pnToCostMap.set(row.pn, row.cost);
    });

    const addCostToItem = (item: BOMItemWithDescription) => ({
      ...item,
      cost: Number(pnToCostMap.get(item.pn)) || 0
    });

    const generalBOMWithCost = generalBOM.map(addCostToItem);

    const waterTankBOMsWithCost = waterTankBOMs.map(innerArray =>
      innerArray.map(addCostToItem)
    );

    const washBayBOMsWithCost = washBayBOMs.map(innerArray =>
      innerArray.map(addCostToItem)
    );

    return {
      generalBOM: generalBOMWithCost,
      waterTankBOMs: waterTankBOMsWithCost,
      washBayBOMs: washBayBOMsWithCost
    };
  }
}
