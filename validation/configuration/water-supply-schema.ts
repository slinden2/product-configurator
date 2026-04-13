import { z } from "zod";
import {
  type SelectOption,
  Water1Pumps,
  Water2Pumps,
  WaterTypes,
} from "@/types";
import {
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
} from "@/validation/common";

export const WaterTypeEnum = z.enum(WaterTypes, {
  message: genericRequiredMessage,
});

export const waterTypes: SelectOption[] = generateSelectOptionsFromZodEnum(
  WaterTypeEnum,
  ["Acqua di rete", "Acqua riciclata", "Acqua demineralizzata"],
);

export const WaterPump1Enum = z.enum(Water1Pumps);

export const waterPump1Opts: SelectOption[] = generateSelectOptionsFromZodEnum(
  WaterPump1Enum,
  [
    "Pompa di rilancio 1.5kW + Q.E.",
    "Pompa di rilancio 2.2kW + Q.E.",
    "Pompa inv. 3kW 200l/min",
    "Pompa inv. 3kW 250l/min",
  ],
);

export const WaterPump2Enum = z.enum(Water2Pumps);

export const waterPump2Opts: SelectOption[] = generateSelectOptionsFromZodEnum(
  WaterPump2Enum,
  ["Pompa di rilancio 1.5kW + Q.E.", "Pompa di rilancio 2.2kW + Q.E."],
);

export const inverterPumpOutletOpts: SelectOption[] = [
  { value: 0, label: "0" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
];

export const inverterPumpSchema = z.object({
  inv_pump_outlet_dosatron_qty: z.number().min(0).max(2),
  inv_pump_outlet_pw_qty: z.number().min(0).max(2),
  has_filter_backwash: z.boolean().default(false),
});

export const waterSupplySchema = z
  .object({
    water_1_type: WaterTypeEnum.optional(),
    water_1_pump: WaterPump1Enum.optional(),
    water_2_type: WaterTypeEnum.optional(),
    water_2_pump: WaterPump2Enum.optional(),
    has_antifreeze: z.boolean().default(false),
  })
  .and(inverterPumpSchema)
  .superRefine((data, ctx) => {
    if (data.water_1_pump !== undefined && data.water_1_type === undefined) {
      ctx.addIssue({
        code: "custom",
        message:
          "Se selezioni la pompa di rilancio devi scegliere anche il tipo acqua 1.",
        path: ["water_1_type"],
      });
    }

    if (data.water_2_pump !== undefined && data.water_2_type === undefined) {
      ctx.addIssue({
        code: "custom",
        message:
          "Se selezioni la seconda pompa devi scegliere anche il tipo acqua 2.",
        path: ["water_2_type"],
      });
    }

    validateInverterPumpFields(data, ctx);
  });

function validateInverterPumpFields(
  data: z.infer<typeof waterSupplySchema>,
  ctx: z.RefinementCtx,
) {
  const numOfSelectedOutlets =
    (data.inv_pump_outlet_dosatron_qty ?? 0) +
    (data.inv_pump_outlet_pw_qty ?? 0);

  const isInverterPumpSelected =
    data.water_1_pump === WaterPump1Enum.enum.INV_3KW_200L ||
    data.water_1_pump === WaterPump1Enum.enum.INV_3KW_250L;

  // If inverter pump selected, need >= 2 outlets
  if (isInverterPumpSelected && numOfSelectedOutlets < 2) {
    // Add issue to both fields for better UX
    ctx.addIssue({
      code: "custom",
      message: "Seleziona almeno due uscite totali (Dosatron + Idro).",
      path: ["inv_pump_outlet_dosatron_qty"], // Point to relevant fields
    });
    ctx.addIssue({
      code: "custom",
      message: "Seleziona almeno due uscite totali (Dosatron + Idro).",
      path: ["inv_pump_outlet_pw_qty"],
    });
  }

  // If outlets or backwash selected but no inverter pump
  if (!isInverterPumpSelected && numOfSelectedOutlets > 0) {
    ctx.addIssue({
      code: "custom",
      message:
        "Non puoi selezionare uscite pompa inverter se la pompa inverter non è selezionata.",
      path: ["water_1_pump"],
    });
  }

  if (!isInverterPumpSelected && data.has_filter_backwash) {
    ctx.addIssue({
      code: "custom",
      message:
        "Il controlavaggio filtro è disponibile solo con pompa inverter.",
      path: ["has_filter_backwash"],
    });
  }
}
