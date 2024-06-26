import { SelectOption } from "@/types";
import {
  emptyStringOrUndefined,
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
} from "@/validation/common";
import { z } from "zod";

export const PanelNumEnum = z.enum(["ONE", "TWO"]);

export const panelNums: SelectOption[] = generateSelectOptionsFromZodEnum(
  PanelNumEnum,
  ["1", "2"]
);

export const PanelPosEnum = z.enum(["INTERNAL", "EXTERNAL"], {
  message: genericRequiredMessage,
});

export const panelPositions: SelectOption[] = generateSelectOptionsFromZodEnum(
  PanelPosEnum,
  ["A bordo", "In piazzola"]
);

export const ExtPanelFixingType = z.enum(["WALL", "POST"], {
  message: genericRequiredMessage,
});

export const extPanelFixingTypes: SelectOption[] =
  generateSelectOptionsFromZodEnum(ExtPanelFixingType, ["A muro", "Su palo"]);

export const cardQtyOpts: SelectOption[] = [];

for (let i = 0; i <= 300; i += 50) {
  cardQtyOpts.push({ value: i.toString(), label: i.toString() });
}

const panelNumDiscriminatedUnion = z.discriminatedUnion("panel_num", [
  z.object({
    panel_num: z.literal(undefined).refine((val) => (!val ? false : val), {
      message: genericRequiredMessage,
    }),
    panel_pos: emptyStringOrUndefined().transform(() => undefined),
  }),
  z.object({
    panel_num: z.literal(PanelNumEnum.enum.ONE),
    panel_pos: PanelPosEnum,
  }),
  z.object({
    panel_num: z.literal(PanelNumEnum.enum.TWO),
    panel_pos: emptyStringOrUndefined().transform(() => undefined),
    ext_panel_fixing_type: ExtPanelFixingType,
  }),
]);

const panelPosDiscriminatedUnion = z.discriminatedUnion("panel_pos", [
  z.object({
    panel_pos: z.literal(undefined),
    ext_panel_fixing_type: ExtPanelFixingType.or(emptyStringOrUndefined()),
  }),
  z.object({
    panel_pos: z.literal("").transform(() => undefined),
    ext_panel_fixing_type: ExtPanelFixingType.or(emptyStringOrUndefined()),
  }),
  z.object({
    panel_pos: z.literal(PanelPosEnum.enum.EXTERNAL),
    ext_panel_fixing_type: ExtPanelFixingType,
  }),
  z.object({
    panel_pos: z.literal(PanelPosEnum.enum.INTERNAL),
    ext_panel_fixing_type: emptyStringOrUndefined().transform(() => undefined),
  }),
]);

export const panelSchema = z
  .object({
    has_itecoweb: z.boolean().default(false),
    has_card_reader: z.boolean().default(false),
    card_num: z
      .string()
      .refine((val) => !isNaN(parseInt(val, 10)), {
        message: "Devi inserire un numero.",
      })
      .or(emptyStringOrUndefined().transform(() => undefined)),
    is_fast: z.boolean().default(false),
  })
  .and(panelNumDiscriminatedUnion)
  .and(panelPosDiscriminatedUnion);
