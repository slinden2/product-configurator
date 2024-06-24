import { SelectOption } from "@/types";
import {
  emptyStringOrUndefined,
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

export const SupplyFixingTypeEnum = z.enum(["NONE", "POST", "WALL"], {
  required_error: genericRequiredMessage,
});

const SupplyFixingTypeNoNoneEnum = z.enum(["POST", "WALL"], {
  errorMap: () => ({
    message:
      "Il tipo di fissaggio deve essere Palo o Staffa a muro per Braccio Mobile o Catena Portacavi.",
  }),
});

export const supplyFixingTypes: SelectOption[] =
  generateSelectOptionsFromZodEnum(SupplyFixingTypeEnum, [
    "Niente",
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

const supplyTypeDiscriminatedUnion = z.discriminatedUnion("supply_type", [
  z.object({
    supply_type: z
      .literal(undefined)
      .refine(() => false, { message: genericRequiredMessage }),
    supply_fixing_type: emptyStringOrUndefined(),
    has_post_frame: emptyStringOrUndefined().transform((val) => Boolean(val)),
    cable_chain_width: emptyStringOrUndefined().transform(() => undefined),
  }),
  z.object({
    supply_type: z.literal(SupplyTypeEnum.enum.STRAIGHT_SHELF),
    supply_fixing_type: SupplyFixingTypeEnum,
    has_post_frame: emptyStringOrUndefined().transform((val) => Boolean(val)),
    cable_chain_width: emptyStringOrUndefined().transform(() => undefined),
  }),
  z.object({
    supply_type: z.literal(SupplyTypeEnum.enum.BOOM),
    supply_fixing_type: SupplyFixingTypeNoNoneEnum,
    has_post_frame: emptyStringOrUndefined()
      .transform((val) => Boolean(val))
      .or(z.boolean().default(false)),
    cable_chain_width: emptyStringOrUndefined().transform(() => undefined),
  }),
  z.object({
    supply_type: z.literal(SupplyTypeEnum.enum.CABLE_CHAIN),
    supply_fixing_type: SupplyFixingTypeNoNoneEnum,
    has_post_frame: emptyStringOrUndefined().transform((val) => Boolean(val)),
    cable_chain_width: CableChainWidthEnum,
  }),
]);

export const supplyTypeSchema = z
  .object({
    supply_side: SupplySideEnum,
  })
  .and(supplyTypeDiscriminatedUnion);
