import { db } from "@/db";
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
import * as XLSX from "xlsx";

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

export type WithSupplyData = Pick<
  Configuration,
  "supply_side" | "supply_type" | "supply_fixing_type" | "energy_chain_width"
> & {
  uses_3000_posts: boolean;
  uses_cable_chain_without_washbay: boolean;
};

export class BOM {
  configuration: ConfigurationWithWaterTanksAndWashBays;
  generalMaxBOM = GeneralMaxBOM;
  waterTankMaxBOM = WaterTankMaxBOM;
  washBayMaxBOM = WashBayMaxBOM;
  usesCableChainWithoutWashBay = false;

  private constructor(configuration: ConfigurationWithWaterTanksAndWashBays) {
    this.configuration = configuration;
    this.usesCableChainWithoutWashBay =
      configuration.wash_bays.length === 0 &&
      configuration.supply_type === "CABLE_CHAIN";
  }

  static async init(
    configuration: ConfigurationWithWaterTanksAndWashBays
  ): Promise<BOM> {
    return new BOM(configuration);
  }

  async buildCompleteBOM(): Promise<{
    generalBOM: BOMItemWithDescription[];
    waterTankBOMs: BOMItemWithDescription[][];
    washBayBOMs: BOMItemWithDescription[][];
  }> {
    const waterTankBOMs = await this.buildWaterTankBOM();
    let washBayBOMs = await this.buildWashBayBOM();
    let generalBOM: BOMItemWithDescription[] = [];

    // This is needed to build the general BOM correctly and add the wash bay BOM (posts)
    // to the general BOM if there are no wash bays (e.g. festoon line) and the supply type is cable chain
    if (this.usesCableChainWithoutWashBay) {
      generalBOM = await this.buildGeneralBOM(washBayBOMs[0]);
      washBayBOMs = [];
    } else {
      generalBOM = await this.buildGeneralBOM();
    }

    return { generalBOM, waterTankBOMs, washBayBOMs };
  }

  async buildGeneralBOM(
    washBayBOM: BOMItemWithDescription[] = []
  ): Promise<BOMItemWithDescription[]> {
    const bom = [
      ...(await this._buildBOM<Configuration>(
        this.generalMaxBOM,
        this.configuration
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
      energy_chain_width: this.configuration.energy_chain_width,
      uses_3000_posts: uses3000posts,
      uses_cable_chain_without_washbay: this.usesCableChainWithoutWashBay,
    };
  }

  async buildWashBayBOM(): Promise<BOMItemWithDescription[][]> {
    const uses3000posts = this.configuration.wash_bays.some((washBay) => {
      return washBay.hp_lance_qty + washBay.det_lance_qty > 2;
    });

    // Check first if there are no wash bays and if the supply type is cable chain
    // because in that case the posts are needed.
    if (
      this.configuration.wash_bays.length === 0 &&
      this.configuration.supply_type === "CABLE_CHAIN" &&
      this.configuration.supply_fixing_type === "POST"
    ) {
      const washBayWithSupplyData: WashBay & WithSupplyData =
        this._generateWashBayObjectWithSupplyData({} as WashBay, {
          uses3000posts,
        });

      return [await this._buildBOM(this.washBayMaxBOM, washBayWithSupplyData)];
    }

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

    // const worksheet = XLSX.utils.json_to_sheet(generalBOM);
    // const workbook = XLSX.utils.book_new();
    // XLSX.utils.book_append_sheet(workbook, worksheet);
    // XLSX.writeFile(workbook, "BOM.xlsx");
  }
}
