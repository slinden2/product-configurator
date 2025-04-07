import { SelectOption } from "@/types";
import {
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
  getNumericSelectOptions,
  invalidOption,
  mustBeUndefined,
  mustBeZero,
} from "@/validation/common";
import { z } from "zod";

export const touchQtyOpts: SelectOption[] = getNumericSelectOptions([1, 2]);

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

const touchQtyDiscriminatedUnion = z
  .discriminatedUnion("touch_qty", [
    z.object({
      touch_qty: z.literal(1),
      touch_pos: TouchPosEnum,
      touch_fixing_type: TouchFixingType.or(mustBeUndefined()),
    }),
    z.object({
      touch_qty: z.literal(2),
      touch_pos: mustBeUndefined(),
      touch_fixing_type: TouchFixingType,
    }),
  ])
  .superRefine((data, ctx) => {
    if (data.touch_pos === "INTERNAL" && data.touch_fixing_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: invalidOption,
        path: ["touch_fixing_type"],
      });
    }

    if (data.touch_pos === "EXTERNAL" && !data.touch_fixing_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: genericRequiredMessage,
        path: ["touch_fixing_type"],
      });
    }
  });

const baseTouchSchema = z.object({
  has_itecoweb: z.boolean().default(false),
  has_card_reader: z.boolean().default(false),
  card_qty: z.coerce
    .number({ message: genericRequiredMessage })
    .min(0)
    .max(300)
    .refine((val) => val % 50 === 0, { message: "Solo multipli di 50" })
    .or(mustBeZero()),
  is_fast: z.boolean().default(false),
});

const touchQtySchema = z
  .object({
    touch_qty: z.coerce
      .number({ message: genericRequiredMessage })
      .min(1)
      .max(2),
  })
  .passthrough()
  .pipe(touchQtyDiscriminatedUnion);

export const touchSchema = baseTouchSchema.and(touchQtySchema);
