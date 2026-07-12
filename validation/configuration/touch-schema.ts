import { z } from "zod";
import { type SelectOption, TouchFixTypes, TouchPos } from "@/types";
import {
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
  getNumericSelectOptions,
  invalidOption,
  numberInOptions,
} from "@/validation/common";

export const touchQtyOpts: SelectOption[] = getNumericSelectOptions([1, 2]);

export const emergencyStopQtyOpts: SelectOption[] = getNumericSelectOptions([
  0, 1, 2,
]);

export const TouchPosEnum = z.enum(TouchPos, {
  error: genericRequiredMessage,
});

export const touchPositionOpts: SelectOption[] =
  generateSelectOptionsFromZodEnum(TouchPosEnum, {
    ON_PANEL: "Su Q.E.",
    ON_DET_CAB: "Su vano detergenti",
    EXTERNAL: "Esterna",
  });

export const TouchFixingTypeEnum = z.enum(TouchFixTypes, {
  error: genericRequiredMessage,
});

export const touchFixingTypeOpts: SelectOption[] =
  generateSelectOptionsFromZodEnum(TouchFixingTypeEnum, {
    POST: "Su palo",
    WALL: "A muro",
  });

export const cardQtyOpts: SelectOption[] = [];

for (let i = 0; i <= 300; i += 50) {
  cardQtyOpts.push({ value: i, label: i.toString() });
}

const baseTouchSchema = z
  .object({
    touch_qty: numberInOptions(touchQtyOpts, genericRequiredMessage)
      // Optional for the initial undefined state
      .optional(),
    touch_pos: TouchPosEnum.optional(),
    touch_fixing_type: TouchFixingTypeEnum.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.touch_qty === undefined) {
      ctx.addIssue({
        code: "custom",
        message: genericRequiredMessage,
        path: ["touch_qty"],
      });
      return;
    }

    if (data.touch_qty === 1) {
      // Position is required
      if (data.touch_pos === undefined) {
        ctx.addIssue({
          code: "custom",
          message: genericRequiredMessage,
          path: ["touch_pos"],
        });
      } else {
        // Only check fixing type if position is known
        // If pos is ON_PANEL or ON_DET_CAB, fixing type must NOT be selected
        if (
          (data.touch_pos === TouchPosEnum.enum.ON_PANEL ||
            data.touch_pos === TouchPosEnum.enum.ON_DET_CAB) &&
          data.touch_fixing_type !== undefined
        ) {
          ctx.addIssue({
            code: "custom",
            message: `${invalidOption} (pos. interna non ha fissaggio)`,
            path: ["touch_fixing_type"],
          });
        }
        // If pos is EXTERNAL, fixing type IS required
        if (
          data.touch_pos === TouchPosEnum.enum.EXTERNAL &&
          data.touch_fixing_type === undefined
        ) {
          ctx.addIssue({
            code: "custom",
            message: genericRequiredMessage,
            path: ["touch_fixing_type"],
          });
        }
      }
    } else if (data.touch_qty === 2) {
      // Fixing type is required
      if (data.touch_fixing_type === undefined) {
        ctx.addIssue({
          code: "custom",
          message: genericRequiredMessage,
          path: ["touch_fixing_type"],
        });
      }
      // Position must NOT be selected
      if (data.touch_pos !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: `${invalidOption} (pos. non applicabile con 2 pannelli)`,
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
      .number({ error: "Quantità invalida" })
      .min(0)
      .max(300)
      .refine((val) => val % 50 === 0, { error: "Solo multipli di 50" })
      .default(0),
    is_fast: z.boolean().default(false),
    emergency_stop_qty: numberInOptions(
      emergencyStopQtyOpts,
      genericRequiredMessage,
    ).default(0),
  })
  .superRefine((data, ctx) => {
    if (data.has_itecoweb && data.has_card_reader) {
      ctx.addIssue({
        code: "custom",
        message: invalidOption,
        path: ["has_itecoweb"],
      });
      ctx.addIssue({
        code: "custom",
        message: invalidOption,
        path: ["has_card_reader"],
      });
    }
  });

export const touchSchema = baseTouchSchema.and(accessoriesSchema);
