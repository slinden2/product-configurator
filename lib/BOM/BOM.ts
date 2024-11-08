import {
  GeneralMaxBOM,
  MaxBOMItem,
  WashBayMaxBOM,
  WaterTankMaxBOM,
} from "@/lib/BOM/MaxBOM";
import prisma from "@/prisma/db";
import { Prisma, Configuration, PartNumber } from "@prisma/client";

export interface BOMItem {
  pn: string;
  qty: number;
}

export interface WithBOMItems {
  bomItems: BOMItem[];
}

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

class BOM {
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

prisma.configuration
  .findUnique({
    where: { id: 1 },
    include: {
      water_tanks: true,
      wash_bays: true,
    },
  })
  .then(async (configuration) => {
    if (configuration) {
      const bom = await BOM.init(configuration);
      console.table(bom.buildGeneralBOM());
      bom.buildWaterTankBOM().forEach((wt) => console.table(wt));
    }
  })
  .catch((err) => console.log(err));
