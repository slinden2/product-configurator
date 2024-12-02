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
  partNumbers: PartNumber[] = [];
  generalMaxBOM = GeneralMaxBOM;
  waterTankMaxBOM = WaterTankMaxBOM;
  washBayMaxBOM = WashBayMaxBOM;

  private constructor(
    configuration: ConfigurationWithWaterTanksAndWashBays,
    partNumbers: PartNumber[]
  ) {
    this.configuration = configuration;
    this.partNumbers = partNumbers;
  }

  static async init(
    configuration: ConfigurationWithWaterTanksAndWashBays
  ): Promise<BOM> {
    const partNumbers = await fetchPartNumbers();
    return new BOM(configuration, partNumbers || []);
  }

  buildGeneralBOM(): BOMItem[] {
    return this._buildBOM<Configuration>(
      this.generalMaxBOM,
      this.configuration
    );
  }

  buildWaterTankBOM(): BOMItem[][] {
    return this.configuration.water_tanks.map((waterTank) =>
      this._buildBOM(this.waterTankMaxBOM, waterTank)
    );
  }

  buildWashBayBOM(): BOMItem[][] {
    const uses3000posts = this.configuration.wash_bays.some((washBay) => {
      return washBay.hp_lance_qty + washBay.det_lance_qty > 2;
    });

    return this.configuration.wash_bays.map((washBay) => {
      const washBayWithSupplyData: WashBay & WithSupplyData = {
        ...washBay,
        supply_side: this.configuration.supply_side,
        supply_type: this.configuration.supply_type,
        supply_fixing_type: this.configuration.supply_fixing_type,
        cable_chain_width: this.configuration.cable_chain_width,
        uses_3000_posts: uses3000posts,
      };

      return this._buildBOM(this.washBayMaxBOM, washBayWithSupplyData);
    });
  }

  private _buildBOM<T>(maxBOM: MaxBOMItem<T>[], configuration: T): BOMItem[] {
    return maxBOM
      .filter((item) =>
        item.conditions.every((conditionFn) => conditionFn(configuration))
      )
      .map((item) => {
        return {
          pn: item.pn,
          qty:
            typeof item.qty === "function" ? item.qty(configuration) : item.qty,
          _description: item._description,
        };
      });
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

async function fetchPartNumbers(): Promise<PartNumber[] | undefined> {
  try {
    return (await prisma.partNumber.findMany({})) || [];
  } catch (err) {
    console.error("Error fetching part numbers: ", err);
  }
}

// prisma.configuration
//   .findUnique({
//     where: { id: 1 },
//     include: {
//       water_tanks: true,
//       wash_bays: true,
//     },
//   })
//   .then(async (configuration) => {
//     if (configuration) {
//       const bom = await BOM.init(configuration);
//       console.table(bom.buildGeneralBOM());
//       bom.buildWaterTankBOM().forEach((wt) => console.table(wt));
//       bom.buildWashBayBOM().forEach((wt) => console.table(wt));
//     }
//   })
//   .catch((err) => console.log(err));
