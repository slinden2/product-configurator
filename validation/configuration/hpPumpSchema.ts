import { SelectOption } from "@/types";
import {
  emptyStringOrUndefined,
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
} from "@/validation/common";
import { z } from "zod";

export const HPPumpOutlet15kwEnum = z.enum(
  [
    "NO_SELECTION",
    "CHASSIS_WASH",
    "LOW_SPINNERS",
    "LOW_BAR",
    "HIGH_BAR",
    "LOW_HIGH_SPINNERS",
  ],
  { message: genericRequiredMessage }
);

export const hpPumpOutlet15kwTypes: SelectOption[] =
  generateSelectOptionsFromZodEnum(HPPumpOutlet15kwEnum, [
    "Niente",
    "Lavachassis",
    "2 robottine basse",
    "Barre HP basse",
    "Barre HP alte",
    "6 robottine",
  ]);

export const HPPumpOutlet30kwEnum = z.enum(
  ["NO_SELECTION", "CHASSIS_WASH", "LOW_SPINNER_HIGH_BAR", "LOW_HIGH_SPINNERS"],
  { message: genericRequiredMessage }
);

export const hpPumpOutlet30kwTypes: SelectOption[] =
  generateSelectOptionsFromZodEnum(HPPumpOutlet30kwEnum, [
    "Niente",
    "Lavachassis",
    "2 robottine basse, barre alte",
    "6 robottine",
  ]);

export const OMZPumpOutletEnum = z.enum(
  ["HP_ROOF_BAR", "SPINNERS", "HP_ROOF_BAR_WITH_SPINNERS"],
  { message: genericRequiredMessage }
);

export const omzPumpOutletTypes: SelectOption[] =
  generateSelectOptionsFromZodEnum(OMZPumpOutletEnum, [
    "Barra oscillante",
    "4 robottine",
    "Barra oscillante e 4 robottine",
  ]);

// Validation function for 15kw and 30kw logic
function validatePumpOutlets<T>(
  data: {
    has_15kw_pump?: boolean | undefined;
    pump_outlet_1_15kw?: T;
    pump_outlet_2_15kw?: T;

    has_30kw_pump?: boolean | undefined;
    pump_outlet_1_30kw?: T;
    pump_outlet_2_30kw?: T;
  },
  ctx: z.RefinementCtx,
  chassisWashOption: T,
  noSelectionValue: T
) {
  const pumpOutlet1 = data.has_15kw_pump
    ? data.pump_outlet_1_15kw
    : data.pump_outlet_1_30kw;
  const pumpOutlet2 = data.has_15kw_pump
    ? data.pump_outlet_2_15kw
    : data.pump_outlet_2_30kw;

  if (pumpOutlet1 === undefined || pumpOutlet2 === undefined) {
    return true; // Outlets are not defined, so they can't be the same or not include the wash option.
  }

  const errorPaths = Object.keys(data).filter((key) =>
    key.startsWith("pump_outlet")
  );

  // Check if both outlets are not selected
  if (pumpOutlet1 === noSelectionValue && pumpOutlet2 === noSelectionValue) {
    errorPaths.forEach((path) => {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Devi selezionare almeno una uscita.",
        path: [path],
      });
    });
  }

  // Check if outlets are the same
  if (pumpOutlet1 === pumpOutlet2) {
    errorPaths.forEach((path) => {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le uscite non possono essere uguali.",
        path: [path],
      });
    });
  }

  // Check if at least one outlet is for chassis wash
  if (
    pumpOutlet1 &&
    pumpOutlet2 &&
    pumpOutlet1 !== noSelectionValue &&
    pumpOutlet2 !== noSelectionValue
  ) {
    if (
      pumpOutlet1 !== chassisWashOption &&
      pumpOutlet2 !== chassisWashOption
    ) {
      errorPaths.forEach((path) => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Una delle uscite dev'essere lavachassis.",
          path: [path],
        });
      });
    }
  }
}

function transformPumpOutlets<T>(
  data: {
    has_15kw_pump?: boolean | undefined;
    pump_outlet_1_15kw?: T;
    pump_outlet_2_15kw?: T;

    has_30kw_pump?: boolean | undefined;
    pump_outlet_1_30kw?: T;
    pump_outlet_2_30kw?: T;
  },
  noSelectionValue: T
): typeof data {
  const is15kwPump = data.has_15kw_pump === true;

  // Get the appropriate outlet properties based on pump type
  const pumpOutlet1Key = is15kwPump
    ? "pump_outlet_1_15kw"
    : "pump_outlet_1_30kw";
  const pumpOutlet2Key = is15kwPump
    ? "pump_outlet_2_15kw"
    : "pump_outlet_2_30kw";
  const pumpOutlet1 = data[pumpOutlet1Key] as T | undefined;
  const pumpOutlet2 = data[pumpOutlet2Key] as T | undefined;

  // Check if the first outlet is not selected and the second one is
  if ((!pumpOutlet1 || pumpOutlet1 === noSelectionValue) && pumpOutlet2) {
    // Swap values
    data[pumpOutlet1Key] = pumpOutlet2;
    data[pumpOutlet2Key] = undefined;
  }

  return data;
}

const hpPump15kwDiscriminatedUnion = z
  .discriminatedUnion("has_15kw_pump", [
    z.object({
      has_15kw_pump: z.literal(undefined).transform((val) => Boolean(val)),
      pump_outlet_1_15kw: emptyStringOrUndefined().transform(() => undefined),
      pump_outlet_2_15kw: emptyStringOrUndefined().transform(() => undefined),
    }),
    z.object({
      has_15kw_pump: z.literal(false),
      pump_outlet_1_15kw: emptyStringOrUndefined().transform(() => undefined),
      pump_outlet_2_15kw: emptyStringOrUndefined().transform(() => undefined),
    }),
    z.object({
      has_15kw_pump: z.literal(true),
      pump_outlet_1_15kw: HPPumpOutlet15kwEnum,
      pump_outlet_2_15kw: HPPumpOutlet15kwEnum,
    }),
  ])
  .superRefine((data, ctx) =>
    validatePumpOutlets(
      data,
      ctx,
      HPPumpOutlet15kwEnum.enum.CHASSIS_WASH,
      HPPumpOutlet15kwEnum.enum.NO_SELECTION
    )
  )
  .transform((data) =>
    transformPumpOutlets(data, HPPumpOutlet15kwEnum.enum.NO_SELECTION)
  );

const hpPump30kwDiscriminatedUnion = z
  .discriminatedUnion("has_30kw_pump", [
    z.object({
      has_30kw_pump: z.literal(undefined).transform((val) => Boolean(val)),
      pump_outlet_1_30kw: emptyStringOrUndefined().transform(() => undefined),
      pump_outlet_2_30kw: emptyStringOrUndefined().transform(() => undefined),
    }),
    z.object({
      has_30kw_pump: z.literal(false),
      pump_outlet_1_30kw: emptyStringOrUndefined().transform(() => undefined),
      pump_outlet_2_30kw: emptyStringOrUndefined().transform(() => undefined),
    }),
    z.object({
      has_30kw_pump: z.literal(true),
      pump_outlet_1_30kw: HPPumpOutlet30kwEnum,
      pump_outlet_2_30kw: HPPumpOutlet30kwEnum,
    }),
  ])
  .superRefine((data, ctx) =>
    validatePumpOutlets(
      data,
      ctx,
      HPPumpOutlet30kwEnum.enum.CHASSIS_WASH,
      HPPumpOutlet30kwEnum.enum.NO_SELECTION
    )
  )
  .transform((data) =>
    transformPumpOutlets(data, HPPumpOutlet30kwEnum.enum.NO_SELECTION)
  );

const hpPumpOmzDiscriminatedUnion = z
  .discriminatedUnion("has_omz_pump", [
    z.object({
      has_omz_pump: z.literal(undefined).transform((val) => Boolean(val)),
      pump_outlet_omz: emptyStringOrUndefined().transform(() => undefined),
      has_chemical_roof_bar: emptyStringOrUndefined().transform((val) =>
        Boolean(val)
      ),
    }),
    z.object({
      has_omz_pump: z.literal(false).transform((val) => Boolean(val)),
      pump_outlet_omz: emptyStringOrUndefined().transform(() => undefined),
      has_chemical_roof_bar: emptyStringOrUndefined().transform((val) =>
        Boolean(val)
      ),
    }),
    z.object({
      has_omz_pump: z.literal(true),
      pump_outlet_omz: OMZPumpOutletEnum,
      has_chemical_roof_bar: z
        .boolean()
        .default(false)
        .or(emptyStringOrUndefined().transform((val) => Boolean(val))),
    }),
  ])
  .refine(
    (data) => {
      if (
        data.pump_outlet_omz !== OMZPumpOutletEnum.enum.HP_ROOF_BAR &&
        data.pump_outlet_omz !==
          OMZPumpOutletEnum.enum.HP_ROOF_BAR_WITH_SPINNERS &&
        data.has_chemical_roof_bar
      ) {
        return false;
      }
      return true;
    },
    {
      message:
        "Non puoi selezionare la nebulizzazione sulla barra oscillante se la barra oscillante non è stata selezionata.",
    }
  );

export const hpPumpSchema = hpPump15kwDiscriminatedUnion
  .and(hpPump30kwDiscriminatedUnion)
  .superRefine((data, ctx) => {
    if (data.has_15kw_pump && data.has_30kw_pump) {
      ["has_15kw_pump", "has_30kw_pump"].forEach((path) => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Non puoi selezionare entrambe le pompe",
          path: [path],
        });
      });
    }
  })
  .and(hpPumpOmzDiscriminatedUnion);
