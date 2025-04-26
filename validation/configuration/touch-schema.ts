import { SelectOption } from "@/types";
import {
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
  getNumericSelectOptions,
  invalidOption,
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
  cardQtyOpts.push({ value: i, label: i.toString() });
}

const baseTouchSchema = z
  .object({
    touch_qty: z
      .union([z.literal(1), z.literal(2)], {
        errorMap: () => ({ message: genericRequiredMessage }), // Error if not 1 or 2 after selection
      })
      .optional(), // Optional for initial undefined state
    touch_pos: TouchPosEnum.optional(),
    touch_fixing_type: TouchFixingType.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.touch_qty === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: genericRequiredMessage,
        path: ["touch_qty"],
      });
      return;
    }

    if (data.touch_qty === 1) {
      // Position is required
      if (data.touch_pos === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: genericRequiredMessage,
          path: ["touch_pos"],
        });
      } else {
        // Only check fixing type if position is known
        // If pos is INTERNAL, fixing type must NOT be selected
        if (
          data.touch_pos === "INTERNAL" &&
          data.touch_fixing_type !== undefined
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: invalidOption + " (pos. interna non ha fissaggio)",
            path: ["touch_fixing_type"],
          });
        }
        // If pos is EXTERNAL, fixing type IS required
        if (
          data.touch_pos === "EXTERNAL" &&
          data.touch_fixing_type === undefined
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: genericRequiredMessage,
            path: ["touch_fixing_type"],
          });
        }
      }
    } else if (data.touch_qty === 2) {
      // Fixing type is required
      if (data.touch_fixing_type === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: genericRequiredMessage,
          path: ["touch_fixing_type"],
        });
      }
      // Position must NOT be selected
      if (data.touch_pos !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: invalidOption + " (pos. non applicabile con 2 pannelli)",
          path: ["touch_pos"],
        });
      }
    }
  });

const accessoriesSchema = z
  .object({
    has_itecoweb: z.boolean().default(false),
    has_card_reader: z.boolean().default(false),
    card_qty: z
      .number({ invalid_type_error: "Quantità invalida" })
      .min(0)
      .max(300)
      .refine((val) => val % 50 === 0, { message: "Solo multipli di 50" })
      .default(0),
    is_fast: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.has_itecoweb && data.has_card_reader) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: invalidOption,
        path: ["has_itecoweb"],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: invalidOption,
        path: ["has_card_reader"],
      });
    }
  });

export const touchSchema = baseTouchSchema.and(accessoriesSchema);
