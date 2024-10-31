import { SelectOption } from "@/types";
import {
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
} from "@/validation/common";
import { inverterPumpSchema } from "@/validation/configuration/invertPumpSchema";
import { z } from "zod";

export const WaterTypeEnum = z.enum(["NETWORK", "RECYCLED", "DEMINERALIZED"], {
  message: genericRequiredMessage,
});

export const waterTypes: SelectOption[] = generateSelectOptionsFromZodEnum(
  WaterTypeEnum,
  ["Acqua di rete", "Acqua riciclata", "Acqua demineralizzata"]
);

export const WaterPump1Enum = z.enum([
  "BOOST_15KW",
  "BOOST_22KW",
  "INV_3KW_200L",
  "INV_3KW_250L",
]);

export const waterPump1Opts: SelectOption[] = generateSelectOptionsFromZodEnum(
  WaterPump1Enum,
  [
    "Pompa di rilancio 1.5kW",
    "Pompa di rilancio 2.2kW",
    "Pompa inv. 3kW 200l/min",
    "Pompa inv. 3kW 250l/min",
  ]
);

export const WaterPump2Enum = z.enum(["BOOST_15KW", "BOOST_22KW"]);

export const waterPump2Opts: SelectOption[] = generateSelectOptionsFromZodEnum(
  WaterPump2Enum,
  ["Pompa di rilancio 1.5kW", "Pompa di rilancio 2.2kW"]
);

export const waterSupplySchema = z
  .object({
    water_1_type: WaterTypeEnum,
    water_1_pump: WaterPump1Enum.nullable().default(null),
    water_2_type: WaterTypeEnum.nullable().default(null),
    water_2_pump: WaterPump2Enum.nullable().default(null),
    has_antifreeze: z.boolean().default(false),
  })
  .and(inverterPumpSchema)
  .superRefine((data, ctx) => {
    // Counts the number of selected outlets and gives error if less than 2
    const numOfSelectedOutlets = Object.entries(data)
      .filter(
        ([key, value]) =>
          key.startsWith("inv_pump_outlet") && typeof value === "number"
      )
      .reduce((acc, [, value]) => {
        const numValue = value as number;
        if (numValue) acc += numValue;
        return acc;
      }, 0);

    const isInverterPumpSelected =
      data.water_1_pump === WaterPump1Enum.enum.INV_3KW_200L ||
      data.water_1_pump === WaterPump1Enum.enum.INV_3KW_250L;

    if (isInverterPumpSelected && numOfSelectedOutlets < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Seleziona almeno due uscite.",
        path: ["water_1_pump"],
      });
    }

    if (!isInverterPumpSelected && numOfSelectedOutlets > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Non puoi selezionare uscite pompa inverter se non pompa inverter non è presente.",
        path: ["water_1_pump"],
      });
    }
  });
