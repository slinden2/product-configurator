import { MaxBOM } from "@/lib/BOM/MaxBOM";
import prisma from "@/prisma/db";
import { Configuration, PartNumber } from "@prisma/client";

export interface BOMItem {
  pn: string;
  qty: number;
}

export interface WithBOMItems {
  bomItems: BOMItem[];
}

class BOM {
  configuration: Configuration;
  partNumbers: PartNumber[] = [];

  private constructor(configuration: Configuration, partNumbers: PartNumber[]) {
    this.configuration = configuration;
    this.partNumbers = partNumbers;
  }

  static async init(configuration: Configuration): Promise<BOM> {
    const partNumbers = await fetchPartNumbers();
    return new BOM(configuration, partNumbers || []);
  }

  generateBOM(): BOMItem[] {
    return MaxBOM.filter((item) =>
      item.conditions.every((conditionFn) => conditionFn(this.configuration))
    ).map((item) => {
      return {
        pn: item.pn,
        qty:
          typeof item.qty === "function"
            ? item.qty(this.configuration)
            : item.qty,
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
  })
  .then(async (configuration) => {
    if (configuration) {
      const bom = await BOM.init(configuration);
      console.log(bom.generateBOM());
    }
  })
  .catch((err) => console.log(err));
