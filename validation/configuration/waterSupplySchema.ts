import { SelectOption } from "@/types";
import {
  emptyStringOrUndefined,
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
} from "@/validation/common";
import { inverterPumpSchema } from "@/validation/configuration/invertPumpSchema";
import { z } from "zod";

const commonWaterTypeValues = ["NETWORK", "RECYCLED", "DEMINERALIZED"] as const;
export const WaterType1Enum = z.enum(commonWaterTypeValues, {
  message: genericRequiredMessage,
});
const commonWaterTypeLabels = [
  "Acqua di rete",
  "Acqua riciclata",
  "Acqua demineralizzata",
];
export const waterTypes1: SelectOption[] = generateSelectOptionsFromZodEnum(
  WaterType1Enum,
  commonWaterTypeLabels
);

export const WaterType2Enum = z.enum([
  "NO_SELECTION",
  ...commonWaterTypeValues,
]);
export const waterTypes2: SelectOption[] = generateSelectOptionsFromZodEnum(
  WaterType2Enum,
  ["No selezione", ...commonWaterTypeLabels]
);

export const WaterPump1Enum = z.enum([
  "NO_SELECTION",
  "BOOST_15KW",
  "BOOST_22KW",
  "INV_3KW_200L",
  "INV_3KW_250L",
]);

export const waterPump1Opts: SelectOption[] = generateSelectOptionsFromZodEnum(
  WaterPump1Enum,
  [
    "No selezione",
    "Pompa di rilancio 1.5kW",
    "Pompa di rilancio 2.2kW",
    "Pompa inv. 3kW 200l/min",
    "Pompa inv. 3kW 250l/min",
  ]
);

export const WaterPump2Enum = z.enum([
  "NO_SELECTION",
  "BOOST_15KW",
  "BOOST_22KW",
]);

export const waterPump2Opts: SelectOption[] = generateSelectOptionsFromZodEnum(
  WaterPump2Enum,
  ["No selezione", "Pompa di rilancio 1.5kW", "Pompa di rilancio 2.2kW"]
);

export const waterSupplySchema = z
  .object({
    water_1_type: WaterType1Enum,
    water_1_pump: WaterPump1Enum.or(emptyStringOrUndefined()).transform((val) =>
      val === WaterPump1Enum.enum.NO_SELECTION || !val ? undefined : val
    ),
    water_2_type: WaterType2Enum.optional().transform((val) =>
      val === WaterType2Enum.enum.NO_SELECTION ? undefined : val
    ),
    water_2_pump: WaterPump1Enum.or(emptyStringOrUndefined()).transform((val) =>
      val === WaterPump1Enum.enum.NO_SELECTION || !val ? undefined : val
    ),
    has_antifreeze: z.boolean().default(false),
  })
  .and(inverterPumpSchema)
  .superRefine((data, ctx) => {
    // Counts the number of selected outlets and gives error if less than 2
    const numOfSelectedOutlets = Object.entries(data)
      .filter(
        ([key, value]) =>
          key.startsWith("inv_pump_outlet") && typeof value === "string"
      )
      .reduce((acc, [, value]) => {
        const stringValue = value as string;
        if (stringValue) acc += parseInt(stringValue, 10) || 0;
        return acc;
      }, 0);

    if (
      (data.water_1_pump === WaterPump1Enum.enum.INV_3KW_200L ||
        data.water_1_pump === WaterPump1Enum.enum.INV_3KW_250L) &&
      numOfSelectedOutlets < 2
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Seleziona almeno due uscite.",
        path: ["water_1_pump"],
      });
    }
  });
