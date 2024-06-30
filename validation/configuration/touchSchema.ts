import { SelectOption } from "@/types";
import {
  emptyStringOrUndefined,
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
} from "@/validation/common";
import { z } from "zod";

export const TouchQtyEnum = z.enum(["ONE", "TWO"]);

export const touchQtyOpts: SelectOption[] = generateSelectOptionsFromZodEnum(
  TouchQtyEnum,
  ["1", "2"]
);

export const TouchPosEnum = z.enum(["INTERNAL", "EXTERNAL"], {
  message: genericRequiredMessage,
});

export const touchPositionOpts: SelectOption[] =
  generateSelectOptionsFromZodEnum(TouchPosEnum, ["A bordo", "In piazzola"]);

export const TouchFixingType = z.enum(["WALL", "POST"], {
  message: genericRequiredMessage,
});

export const touchFixingTypeOpts: SelectOption[] =
  generateSelectOptionsFromZodEnum(TouchFixingType, ["A muro", "Su palo"]);

export const cardQtyOpts: SelectOption[] = [];

for (let i = 0; i <= 300; i += 50) {
  cardQtyOpts.push({ value: i.toString(), label: i.toString() });
}

const touchQtyDiscriminatedUnion = z.discriminatedUnion("touch_qty", [
  z.object({
    touch_qty: z.literal(undefined).refine((val) => (!val ? false : val), {
      message: genericRequiredMessage,
    }),
    touch_pos: emptyStringOrUndefined().transform(() => undefined),
  }),
  z.object({
    touch_qty: z.literal(TouchQtyEnum.enum.ONE),
    touch_pos: TouchPosEnum,
  }),
  z.object({
    touch_qty: z.literal(TouchQtyEnum.enum.TWO),
    touch_pos: emptyStringOrUndefined().transform(() => undefined),
    touch_fixing_type: TouchFixingType,
  }),
]);

const touchPosDiscriminatedUnion = z.discriminatedUnion("touch_pos", [
  z.object({
    touch_pos: z.literal(undefined),
    touch_fixing_type: TouchFixingType.or(emptyStringOrUndefined()),
  }),
  z.object({
    touch_pos: z.literal("").transform(() => undefined),
    touch_fixing_type: TouchFixingType.or(emptyStringOrUndefined()),
  }),
  z.object({
    touch_pos: z.literal(TouchPosEnum.enum.EXTERNAL),
    touch_fixing_type: TouchFixingType,
  }),
  z.object({
    touch_pos: z.literal(TouchPosEnum.enum.INTERNAL),
    touch_fixing_type: emptyStringOrUndefined().transform(() => undefined),
  }),
]);

export const touchSchema = z
  .object({
    has_itecoweb: z.boolean().default(false),
    has_card_reader: z.boolean().default(false),
    card_qty: z
      .string()
      .refine((val) => !isNaN(parseInt(val, 10)), {
        message: "Devi inserire un numero.",
      })
      .or(emptyStringOrUndefined().transform(() => "0")),
    is_fast: z.boolean().default(false),
  })
  .and(touchQtyDiscriminatedUnion)
  .and(touchPosDiscriminatedUnion);
