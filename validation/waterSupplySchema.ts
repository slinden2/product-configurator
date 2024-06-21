import { SelectOption } from "@/types";
import {
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
} from "@/validation/common";
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

export const boosterPumpEnum = z.enum(["NO_SELECTION", "1.5KW", "2.2KW"]);
export const boosterPumps: SelectOption[] = generateSelectOptionsFromZodEnum(
  boosterPumpEnum,
  ["No selezione", "1.5KW", "2.2KW"]
);

export const waterSupplySchema = z
  .object({
    water_type_1: WaterType1Enum,
    booster_pump_1: boosterPumpEnum
      .optional()
      .transform((val) =>
        val === boosterPumpEnum.enum.NO_SELECTION ? undefined : val
      ),
    water_type_2: WaterType2Enum.optional().transform((val) =>
      val === WaterType2Enum.enum.NO_SELECTION ? undefined : val
    ),
    booster_pump_2: boosterPumpEnum
      .optional()
      .transform((val) =>
        val === boosterPumpEnum.enum.NO_SELECTION ? undefined : val
      ),
    has_antifreeze: z.boolean().default(false),
  })
  .refine(
    (data) => {
      if (!data.water_type_2 && typeof data.booster_pump_2 !== "undefined") {
        return false;
      }
      return true;
    },
    {
      message: "Il campo Pompa di rilancio 2 deve essere resettato.",
      path: ["water_type_2"],
    }
  );
