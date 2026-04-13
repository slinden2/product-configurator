import { z } from "zod";
import { PressureWashers, type SelectOption } from "@/types";
import {
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
} from "@/validation/common";
import { CableChainWidthEnum } from "@/validation/configuration/supply-type-schema";

export const PressureWasherTypeEnum = z.enum(PressureWashers, {
  message: genericRequiredMessage,
});

export const pressureWasherOpts: SelectOption[] =
  generateSelectOptionsFromZodEnum(PressureWasherTypeEnum, [
    "21 l/min 150 bar",
    "21 l/min 200 bar",
  ]);

const lanceErrMsg = "La quantità di lance deve essere 0 o 2.";

export const washBaySchema = z
  .object({
    hp_lance_qty: z
      .number({ message: genericRequiredMessage })
      .refine((val) => val === 0 || val === 2, {
        message: lanceErrMsg,
      })
      .default(0),
    det_lance_qty: z
      .number({ message: genericRequiredMessage })
      .refine((val) => val === 0 || val === 2, {
        message: lanceErrMsg,
      })
      .default(0),
    hose_reel_hp_with_post_qty: z
      .number({ message: genericRequiredMessage })
      .min(0)
      .max(2)
      .default(0),
    hose_reel_hp_without_post_qty: z
      .number({ message: genericRequiredMessage })
      .min(0)
      .max(2)
      .default(0),
    hose_reel_det_with_post_qty: z
      .number({ message: genericRequiredMessage })
      .min(0)
      .max(2)
      .default(0),
    hose_reel_det_without_post_qty: z
      .number({ message: genericRequiredMessage })
      .min(0)
      .max(2)
      .default(0),
    hose_reel_hp_det_with_post_qty: z
      .number({ message: genericRequiredMessage })
      .min(0)
      .max(2)
      .default(0),
    pressure_washer_type: PressureWasherTypeEnum.optional(),
    pressure_washer_qty: z
      .number({ message: genericRequiredMessage })
      .min(0)
      .max(3)
      .optional(),
    has_gantry: z.boolean().default(false),
    energy_chain_width: CableChainWidthEnum.optional(),
    has_shelf_extension: z.boolean().default(false),
    ec_signal_cable_qty: z.number().min(1).max(2).optional(),
    ec_profinet_cable_qty: z.number().min(0).max(1).optional(),
    ec_water_1_tube_qty: z.number().min(1).max(2).optional(),
    ec_water_34_tube_qty: z.number().min(0).max(2).optional(),
    ec_r1_1_tube_qty: z.number().min(0).max(2).optional(),
    ec_r2_1_tube_qty: z.number().min(0).max(2).optional(),
    ec_r2_34_inox_tube_qty: z.number().min(0).max(3).optional(),
    ec_air_tube_qty: z.number().min(0).max(1).optional(),
    is_first_bay: z.boolean().default(false),
    has_bay_dividers: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (
      data.pressure_washer_type !== undefined &&
      (data.pressure_washer_qty === 0 || data.pressure_washer_qty === undefined)
    ) {
      ctx.addIssue({
        code: "custom",
        message: genericRequiredMessage,
        path: ["pressure_washer_qty"],
      });
    }

    if (
      data.pressure_washer_qty !== undefined &&
      data.pressure_washer_qty > 0 &&
      data.pressure_washer_type === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        message: genericRequiredMessage,
        path: ["pressure_washer_type"],
      });
    }

    const totalHoseReels =
      data.hose_reel_hp_with_post_qty +
      data.hose_reel_hp_without_post_qty +
      data.hose_reel_det_with_post_qty +
      data.hose_reel_det_without_post_qty +
      data.hose_reel_hp_det_with_post_qty;
    if (totalHoseReels > 3) {
      ctx.addIssue({
        code: "custom",
        message: "Il numero totale di avvolgitori non può superare 3.",
        path: ["hose_reel_hp_with_post_qty"],
      });
    }

    // When energy chain is active, signal cable and water 1" tube are required
    if (data.has_gantry && data.energy_chain_width !== undefined) {
      if (data.ec_signal_cable_qty === undefined) {
        ctx.addIssue({
          code: "custom",
          message: genericRequiredMessage,
          path: ["ec_signal_cable_qty"],
        });
      }
      if (data.ec_water_1_tube_qty === undefined) {
        ctx.addIssue({
          code: "custom",
          message: genericRequiredMessage,
          path: ["ec_water_1_tube_qty"],
        });
      }
    }
  });

export type WashBaySchema = z.infer<typeof washBaySchema>;

export const updateWashBaySchema = washBaySchema.and(
  z.object({ id: z.number(), configuration_id: z.number() }),
);
export type UpdateWashBaySchema = z.infer<typeof updateWashBaySchema>;

export const washBayDefaults: WashBaySchema = {
  hp_lance_qty: 0,
  det_lance_qty: 0,
  hose_reel_hp_with_post_qty: 0,
  hose_reel_hp_without_post_qty: 0,
  hose_reel_det_with_post_qty: 0,
  hose_reel_det_without_post_qty: 0,
  hose_reel_hp_det_with_post_qty: 0,
  pressure_washer_type: undefined,
  pressure_washer_qty: undefined,
  has_gantry: false,
  energy_chain_width: undefined,
  has_shelf_extension: false,
  ec_signal_cable_qty: undefined,
  ec_profinet_cable_qty: undefined,
  ec_water_1_tube_qty: undefined,
  ec_water_34_tube_qty: undefined,
  ec_r1_1_tube_qty: undefined,
  ec_r2_1_tube_qty: undefined,
  ec_r2_34_inox_tube_qty: undefined,
  ec_air_tube_qty: undefined,
  is_first_bay: false,
  has_bay_dividers: false,
};
