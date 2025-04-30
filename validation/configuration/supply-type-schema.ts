import { SelectOption } from "@/types";
import {
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
} from "@/validation/common";
import { z } from "zod";

export const SupplyTypeEnum = z.enum(
  ["STRAIGHT_SHELF", "BOOM", "CABLE_CHAIN"],
  {
    message: genericRequiredMessage,
  }
);

export const supplyTypes: SelectOption[] = generateSelectOptionsFromZodEnum(
  SupplyTypeEnum,
  ["Mensola Dritta", "Braccio Mobile", "Catena Portacavi"]
);

export const CableChainWidthEnum = z.enum(["L150", "L200", "L250", "L300"], {
  message: genericRequiredMessage,
});

export const cableChainWidths: SelectOption[] =
  generateSelectOptionsFromZodEnum(CableChainWidthEnum, [
    "ST072S.150.R300",
    "ST072S.200.R300",
    "ST072S.250.R300",
    "ST072S.300.R300",
  ]);

export const SupplyFixingTypeEnum = z.enum(["POST", "WALL"], {
  errorMap: () => {
    return {
      message: genericRequiredMessage,
    };
  },
});

export const supplyFixingTypes: SelectOption[] =
  generateSelectOptionsFromZodEnum(SupplyFixingTypeEnum, [
    "Palo alimentazione",
    "Staffa a muro",
  ]);

export const SupplySideEnum = z.enum(["TBD", "LEFT", "RIGHT"], {
  message: genericRequiredMessage,
});
export const supplySides: SelectOption[] = generateSelectOptionsFromZodEnum(
  SupplySideEnum,
  ["Da definire", "Sinistra", "Destra"]
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
      energy_chain_width: CableChainWidthEnum.optional(),
    }),

    z.object({
      supply_type: z.literal(SupplyTypeEnum.enum.STRAIGHT_SHELF),
      supply_side: SupplySideEnum.optional(),
      supply_fixing_type: SupplyFixingTypeEnum.optional(),
      has_post_frame: z.boolean().default(false),
      energy_chain_width: z.undefined(),
    }),

    z.object({
      supply_type: z.literal(SupplyTypeEnum.enum.BOOM),
      supply_side: SupplySideEnum.optional(),
      supply_fixing_type: SupplyFixingTypeEnum.optional(),
      has_post_frame: z.boolean().default(false),
      energy_chain_width: z.undefined(),
    }),

    z.object({
      supply_type: z.literal(SupplyTypeEnum.enum.CABLE_CHAIN),
      supply_side: SupplySideEnum.optional(),
      supply_fixing_type: SupplyFixingTypeEnum.optional(),
      has_post_frame: z.literal(false).default(false),
      energy_chain_width: CableChainWidthEnum.optional(),
    }),
  ])
  .superRefine((data, ctx) => {
    if (data.supply_type === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: genericRequiredMessage,
        path: ["supply_type"],
      });
    }

    if (data.supply_side === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: genericRequiredMessage,
        path: ["supply_side"],
      });
    }

    if (
      data.supply_fixing_type === undefined &&
      data.supply_type !== SupplyTypeEnum.enum.STRAIGHT_SHELF
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: genericRequiredMessage,
        path: ["supply_fixing_type"],
      });
    }

    if (data.supply_type === SupplyTypeEnum.enum.BOOM) {
      if (data.supply_fixing_type === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: genericRequiredMessage,
          path: ["supply_fixing_type"],
        });
      }
    } else if (data.supply_type === SupplyTypeEnum.enum.CABLE_CHAIN) {
      if (data.supply_fixing_type === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: genericRequiredMessage,
          path: ["supply_fixing_type"],
        });
      }
      if (data.energy_chain_width === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: genericRequiredMessage,
          path: ["energy_chain_width"],
        });
      }
    } // For STRAIGHT_SHELF, fixing type is optional/nullable, only check post frame dependency
    else if (data.supply_type === SupplyTypeEnum.enum.STRAIGHT_SHELF) {
      if (
        data.supply_fixing_type !== undefined &&
        data.supply_fixing_type !== SupplyFixingTypeEnum.enum.POST &&
        data.has_post_frame
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Telaio disponibile solo con fissaggio a Palo.",
          path: ["has_post_frame"],
        });
      }
    }
  });

// Type definition will infer correctly based on the merged schemas.
export type SupplyTypeSchema = z.infer<typeof supplyTypeSchema>;
