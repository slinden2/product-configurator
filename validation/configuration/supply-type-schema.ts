import { z } from "zod";
import {
  EnergyChainWidths,
  type SelectOption,
  SupplyFixTypes,
  SupplySides,
  SupplyTypes,
} from "@/types";
import {
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
} from "@/validation/common";

export const SupplyTypeEnum = z.enum(SupplyTypes, {
  message: genericRequiredMessage,
});

export const supplyTypes: SelectOption[] = generateSelectOptionsFromZodEnum(
  SupplyTypeEnum,
  ["Mensola dritta", "Braccio mobile", "Catena portacavi"],
);

export const CableChainWidthEnum = z.enum(EnergyChainWidths, {
  message: genericRequiredMessage,
});

export const cableChainWidths: SelectOption[] =
  generateSelectOptionsFromZodEnum(CableChainWidthEnum, [
    "ST072S.150.R300",
    "ST072S.200.R300",
    "ST072S.250.R300",
    "ST072S.300.R300",
  ]);

export const SupplyFixingTypeEnum = z.enum(SupplyFixTypes, {
  message: genericRequiredMessage,
});

export const supplyFixingTypes: SelectOption[] =
  generateSelectOptionsFromZodEnum(SupplyFixingTypeEnum, [
    "Palo alimentazione",
    "Staffa a muro",
  ]);

export const SupplySideEnum = z.enum(SupplySides, {
  message: genericRequiredMessage,
});
export const supplySides: SelectOption[] = generateSelectOptionsFromZodEnum(
  SupplySideEnum,
  ["Da definire", "Sinistra", "Destra"],
);

export const supplyTypeSchema = z
  .discriminatedUnion("supply_type", [
    // Relaxed validation for the "undefined" case so that the "superRefine" can be used
    // for error messages
    z.object({
      supply_type: z.undefined(),
      supply_side: SupplySideEnum.optional(),
      supply_fixing_type: SupplyFixingTypeEnum.optional(),
      has_post_frame: z.literal(false).default(false),
    }),

    z.object({
      supply_type: z.literal(SupplyTypeEnum.enum.STRAIGHT_SHELF),
      supply_side: SupplySideEnum.optional(),
      supply_fixing_type: SupplyFixingTypeEnum.optional(),
      has_post_frame: z.boolean().default(false),
    }),

    z.object({
      supply_type: z.literal(SupplyTypeEnum.enum.BOOM),
      supply_side: SupplySideEnum.optional(),
      supply_fixing_type: SupplyFixingTypeEnum.optional(),
      has_post_frame: z.boolean().default(false),
    }),

    z.object({
      supply_type: z.literal(SupplyTypeEnum.enum.ENERGY_CHAIN),
      supply_side: SupplySideEnum.optional(),
      supply_fixing_type: SupplyFixingTypeEnum.optional(),
      has_post_frame: z.literal(false).default(false),
    }),
  ])
  .superRefine((data, ctx) => {
    if (data.supply_type === undefined) {
      ctx.addIssue({
        code: "custom",
        message: genericRequiredMessage,
        path: ["supply_type"],
      });
    }

    if (data.supply_side === undefined) {
      ctx.addIssue({
        code: "custom",
        message: genericRequiredMessage,
        path: ["supply_side"],
      });
    }

    if (
      data.supply_fixing_type === undefined &&
      data.supply_type !== SupplyTypeEnum.enum.STRAIGHT_SHELF
    ) {
      ctx.addIssue({
        code: "custom",
        message: genericRequiredMessage,
        path: ["supply_fixing_type"],
      });
    }

    // For STRAIGHT_SHELF, fixing type is optional; only check post frame dependency
    if (data.supply_type === SupplyTypeEnum.enum.STRAIGHT_SHELF) {
      if (
        data.supply_fixing_type !== undefined &&
        data.supply_fixing_type !== SupplyFixingTypeEnum.enum.POST &&
        data.has_post_frame
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Telaio disponibile solo con fissaggio a Palo.",
          path: ["has_post_frame"],
        });
      }
    }
  });

// Type definition will infer correctly based on the merged schemas.
export type SupplyTypeSchema = z.infer<typeof supplyTypeSchema>;
