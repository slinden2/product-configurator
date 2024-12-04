import {
  GeneralMaxBOM,
  MaxBOMItem,
  WashBayMaxBOM,
  WaterTankMaxBOM,
} from "@/lib/BOM/MaxBOM";
import prisma from "@/prisma/db";
import { Prisma, Configuration, PartNumber, WashBay } from "@prisma/client";

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
  "supply_side" | "supply_type" | "supply_fixing_type" | "cable_chain_width"
> & { uses_3000_posts: boolean };

const configurationWithWaterTanksAndWashBays =
  Prisma.validator<Prisma.ConfigurationDefaultArgs>()({
    include: {
      water_tanks: true,
      wash_bays: true,
    },
  });

type ConfigurationWithWaterTanksAndWashBays = Prisma.ConfigurationGetPayload<
  typeof configurationWithWaterTanksAndWashBays
>;

export class BOM {
  configuration: ConfigurationWithWaterTanksAndWashBays;
  generalMaxBOM = GeneralMaxBOM;
  waterTankMaxBOM = WaterTankMaxBOM;
  washBayMaxBOM = WashBayMaxBOM;

  private constructor(configuration: ConfigurationWithWaterTanksAndWashBays) {
    this.configuration = configuration;
  }

  static async init(
    configuration: ConfigurationWithWaterTanksAndWashBays
  ): Promise<BOM> {
    return new BOM(configuration);
  }

  async buildGeneralBOM(): Promise<BOMItemWithDescription[]> {
    return await this._buildBOM<Configuration>(
      this.generalMaxBOM,
      this.configuration
    );
  }

  async buildWaterTankBOM(): Promise<BOMItemWithDescription[][]> {
    return await Promise.all(
      this.configuration.water_tanks.map(
        async (waterTank) =>
          await this._buildBOM(this.waterTankMaxBOM, waterTank)
      )
    );
  }

  async buildWashBayBOM(): Promise<BOMItemWithDescription[][]> {
    const uses3000posts = this.configuration.wash_bays.some((washBay) => {
      return washBay.hp_lance_qty + washBay.det_lance_qty > 2;
    });

    return await Promise.all(
      this.configuration.wash_bays.map(async (washBay) => {
        const washBayWithSupplyData: WashBay & WithSupplyData = {
          ...washBay,
          supply_side: this.configuration.supply_side,
          supply_type: this.configuration.supply_type,
          supply_fixing_type: this.configuration.supply_fixing_type,
          cable_chain_width: this.configuration.cable_chain_width,
          uses_3000_posts: uses3000posts,
        };

        return await this._buildBOM(this.washBayMaxBOM, washBayWithSupplyData);
      })
    );
  }

  private async _buildBOM<T>(
    maxBOM: MaxBOMItem<T>[],
    configuration: T
  ): Promise<BOMItemWithDescription[]> {
    return await Promise.all(
      maxBOM
        .filter((item) =>
          item.conditions.every((conditionFn) => conditionFn(configuration))
        )
        .map(async (item) => {
          const partNumber = await prisma.partNumber.findUnique({
            where: { pn: item.pn },
          });
          return {
            pn: item.pn,
            qty:
              typeof item.qty === "function"
                ? item.qty(configuration)
                : item.qty,
            _description: item._description,
            description: partNumber?.description || "N/A",
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
}
