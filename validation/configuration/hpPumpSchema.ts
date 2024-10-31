import { SelectOption } from "@/types";
import {
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
  mustBeFalse,
  mustBeUndefined,
} from "@/validation/common";
import { z } from "zod";

export const HPPumpOutlet15kwEnum = z.enum(
  ["CHASSIS_WASH", "LOW_SPINNERS", "LOW_BARS", "HIGH_BARS"],
  { message: genericRequiredMessage }
);

export const hpPumpOutlet15kwTypes: SelectOption[] =
  generateSelectOptionsFromZodEnum(HPPumpOutlet15kwEnum, [
    "Lavachassis",
    "2 robottine basse",
    "Barre HP basse",
    "Barre HP alte",
  ]);

export const HPPumpOutlet30kwEnum = z.enum(
  ["CHASSIS_WASH", "LOW_SPINNERS_HIGH_BARS", "LOW_HIGH_SPINNERS"],
  { message: genericRequiredMessage }
);

export const hpPumpOutlet30kwTypes: SelectOption[] =
  generateSelectOptionsFromZodEnum(HPPumpOutlet30kwEnum, [
    "Lavachassis",
    "2 robottine basse, barre alte",
    "6 robottine",
  ]);

export const OMZPumpOutletEnum = z.enum(
  ["HP_ROOF_BAR", "SPINNERS", "HP_ROOF_BAR_SPINNERS"],
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
  hasPump: boolean,
  pumpOutlet1: T,
  pumpOutlet2: T,
  ctx: z.RefinementCtx,
  chassisWashOption: T,
  errorPaths: string[]
) {
  if (!hasPump) {
    return true;
  }

  // Check if both outlets are not selected
  if (!pumpOutlet1 && !pumpOutlet2) {
    console.log("runs");
    errorPaths.forEach((path) => {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Devi selezionare almeno una uscita.",
        path: [path],
      });
    });
    return false;
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
    return false;
  }

  // Check if at least one outlet is for chassis wash
  if (pumpOutlet1 && pumpOutlet2) {
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
    return false;
  }

  return true;
}

function transformPumpOutlets<T>(
  data: T,
  pumpOutlet1Key: keyof T,
  pumpOutlet2Key: keyof T
): typeof data {
  const pumpOutlet1 = data[pumpOutlet1Key];
  const pumpOutlet2 = data[pumpOutlet2Key];

  // Check if the first outlet is not selected and the second one is
  if (!pumpOutlet1 && pumpOutlet2) {
    // Swap values
    data[pumpOutlet1Key] = pumpOutlet2;
    data[pumpOutlet2Key] = null as T[keyof T];
  }

  return data;
}

const hpPump15kwDiscriminatedUnion = z
  .object({
    has_15kw_pump: z.coerce.boolean(),
  })
  .passthrough()
  .pipe(
    z
      .discriminatedUnion("has_15kw_pump", [
        z.object({
          has_15kw_pump: z.literal(false),
          pump_outlet_1_15kw: mustBeUndefined(),
          pump_outlet_2_15kw: mustBeUndefined(),
        }),
        z.object({
          has_15kw_pump: z.literal(true),
          pump_outlet_1_15kw: HPPumpOutlet15kwEnum.nullable(),
          pump_outlet_2_15kw: HPPumpOutlet15kwEnum.nullable(),
        }),
      ])
      .superRefine((data, ctx) =>
        validatePumpOutlets(
          data.has_15kw_pump,
          data.pump_outlet_1_15kw,
          data.pump_outlet_2_15kw,
          ctx,
          HPPumpOutlet15kwEnum.enum.CHASSIS_WASH,
          ["pump_outlet_1_15kw", "pump_outlet_2_15kw"]
        )
      )
      .transform((data) =>
        transformPumpOutlets<typeof data>(
          data,
          "pump_outlet_1_15kw",
          "pump_outlet_2_15kw"
        )
      )
  );

const hpPump30kwDiscriminatedUnion = z
  .object({
    has_30kw_pump: z.coerce.boolean(),
  })
  .passthrough()
  .pipe(
    z
      .discriminatedUnion("has_30kw_pump", [
        z.object({
          has_30kw_pump: z.literal(false),
          pump_outlet_1_30kw: mustBeUndefined(),
          pump_outlet_2_30kw: mustBeUndefined(),
        }),
        z.object({
          has_30kw_pump: z.literal(true),
          pump_outlet_1_30kw: HPPumpOutlet30kwEnum.nullable(),
          pump_outlet_2_30kw: HPPumpOutlet30kwEnum.nullable(),
        }),
      ])
      .superRefine((data, ctx) =>
        validatePumpOutlets(
          data.has_30kw_pump,
          data.pump_outlet_1_30kw,
          data.pump_outlet_2_30kw,
          ctx,
          HPPumpOutlet30kwEnum.enum.CHASSIS_WASH,
          ["pump_outlet_1_30kw", "pump_outlet_2_30kw"]
        )
      )
      .transform((data) =>
        transformPumpOutlets<typeof data>(
          data,
          "pump_outlet_1_30kw",
          "pump_outlet_2_30kw"
        )
      )
  );

const hpPumpOmzDiscriminatedUnion = z
  .object({
    has_omz_pump: z.coerce.boolean(),
  })
  .passthrough()
  .pipe(
    z
      .discriminatedUnion("has_omz_pump", [
        z.object({
          has_omz_pump: z.literal(false),
          pump_outlet_omz: mustBeUndefined(),
          has_chemical_roof_bar: mustBeFalse(),
        }),
        z.object({
          has_omz_pump: z.literal(true),
          pump_outlet_omz: OMZPumpOutletEnum,
          has_chemical_roof_bar: z.boolean().default(false).or(mustBeFalse()),
        }),
      ])
      .refine(
        (data) => {
          if (
            data.pump_outlet_omz !== OMZPumpOutletEnum.enum.HP_ROOF_BAR &&
            data.pump_outlet_omz !==
              OMZPumpOutletEnum.enum.HP_ROOF_BAR_SPINNERS &&
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
      )
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
