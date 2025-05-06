import { SelectOption } from "@/types";
import {
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
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
  [
    "CHASSIS_WASH_HORIZONTAL",
    "CHASSIS_WASH_LATERAL_HORIZONTAL",
    "LOW_SPINNERS_HIGH_BARS",
    "LOW_MEDIUM_SPINNERS",
    "HIGH_MEDIUM_SPINNERS",
  ],
  { message: genericRequiredMessage }
);

export const hpPumpOutlet30kwTypes: SelectOption[] =
  generateSelectOptionsFromZodEnum(HPPumpOutlet30kwEnum, [
    "Lavachassis orizzontale",
    "Lavachassis orizzontale + laterale",
    "2 robottine basse, barre alte",
    "2 robottine basse + 2 medie",
    "2 robottine alte + 2 medie",
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
  pumpOutlet1: T | undefined,
  pumpOutlet2: T | undefined,
  ctx: z.RefinementCtx,
  chassisWashOption: T | T[],
  errorPaths: string[]
) {
  if (!hasPump) {
    return;
  }

  // Check if both outlets are undefined
  if (pumpOutlet1 === undefined && pumpOutlet2 === undefined) {
    errorPaths.forEach((path) => {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Devi selezionare almeno una uscita.",
        path: [path],
      });
    });
    return; // No further checks needed if no outlets selected
  }

  // Check if outlets are the same (and not undefined)
  if (pumpOutlet1 !== undefined && pumpOutlet1 === pumpOutlet2) {
    errorPaths.forEach((path) => {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le uscite non possono essere uguali.",
        path: [path],
      });
    });
  }

  // Check if both outlets are chassis wash options
  if (
    Array.isArray(chassisWashOption) &&
    pumpOutlet1 !== undefined &&
    pumpOutlet2 !== undefined
  ) {
    if (
      chassisWashOption.includes(pumpOutlet1) &&
      chassisWashOption.includes(pumpOutlet2)
    ) {
      errorPaths.forEach((path) => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Non puoi selezionare lavachassis due volte.",
          path: [path],
        });
      });
    }
  }

  // Check if at least one outlet is for chassis wash (only if BOTH are selected)
  if (pumpOutlet1 !== undefined && pumpOutlet2 !== undefined) {
    const outlet1IsChassis = Array.isArray(chassisWashOption)
      ? chassisWashOption.includes(pumpOutlet1)
      : pumpOutlet1 === chassisWashOption;
    const outlet2IsChassis = Array.isArray(chassisWashOption)
      ? chassisWashOption.includes(pumpOutlet2)
      : pumpOutlet2 === chassisWashOption;

    if (!outlet1IsChassis && !outlet2IsChassis) {
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

// --- Transform Helper Updated for Undefined ---
// Swaps outlets if outlet1 is empty and outlet2 is selected
function transformPumpOutlets<
  TData extends Partial<Record<TKey1 | TKey2, unknown>>, // Ensure keys exist
  TKey1 extends keyof TData,
  TKey2 extends keyof TData
>(data: TData, pumpOutlet1Key: TKey1, pumpOutlet2Key: TKey2): TData {
  const pumpOutlet1 = data[pumpOutlet1Key];
  const pumpOutlet2 = data[pumpOutlet2Key];

  // Check if the first outlet is undefined and the second one is not
  if (pumpOutlet1 === undefined && pumpOutlet2 !== undefined) {
    // Swap values
    data[pumpOutlet1Key] = pumpOutlet2 as TData[TKey1];
    data[pumpOutlet2Key] = undefined as TData[TKey2]; // Set to undefined
  }

  return data;
}

const hpPump15kwDiscriminatedUnion = z
  .object({
    has_15kw_pump: z.boolean().default(false),
  })
  .passthrough()
  .pipe(
    z
      .discriminatedUnion("has_15kw_pump", [
        z.object({
          has_15kw_pump: z.literal(false),
          pump_outlet_1_15kw: z.undefined(),
          pump_outlet_2_15kw: z.undefined(),
        }),
        z.object({
          has_15kw_pump: z.literal(true),
          pump_outlet_1_15kw: HPPumpOutlet15kwEnum.optional(),
          pump_outlet_2_15kw: HPPumpOutlet15kwEnum.optional(),
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
        transformPumpOutlets(data, "pump_outlet_1_15kw", "pump_outlet_2_15kw")
      )
  );

const hpPump30kwDiscriminatedUnion = z
  .object({
    has_30kw_pump: z.boolean().default(false),
  })
  .passthrough()
  .pipe(
    z
      .discriminatedUnion("has_30kw_pump", [
        z.object({
          has_30kw_pump: z.literal(false),
          pump_outlet_1_30kw: z.undefined(),
          pump_outlet_2_30kw: z.undefined(),
        }),
        z.object({
          has_30kw_pump: z.literal(true),
          pump_outlet_1_30kw: HPPumpOutlet30kwEnum.optional(),
          pump_outlet_2_30kw: HPPumpOutlet30kwEnum.optional(),
        }),
      ])
      .superRefine((data, ctx) =>
        validatePumpOutlets(
          data.has_30kw_pump,
          data.pump_outlet_1_30kw,
          data.pump_outlet_2_30kw,
          ctx,
          [
            HPPumpOutlet30kwEnum.enum.CHASSIS_WASH_HORIZONTAL,
            HPPumpOutlet30kwEnum.enum.CHASSIS_WASH_LATERAL_HORIZONTAL,
          ],
          ["pump_outlet_1_30kw", "pump_outlet_2_30kw"]
        )
      )
      .transform((data) =>
        transformPumpOutlets(data, "pump_outlet_1_30kw", "pump_outlet_2_30kw")
      )
  );

const hpPumpOmzDiscriminatedUnion = z
  .object({
    has_omz_pump: z.boolean().default(false),
  })
  .passthrough()
  .pipe(
    z
      .discriminatedUnion("has_omz_pump", [
        z.object({
          has_omz_pump: z.literal(false),
          pump_outlet_omz: z.undefined(),
          has_chemical_roof_bar: z.boolean().default(false),
        }),
        z.object({
          has_omz_pump: z.literal(true),
          pump_outlet_omz: OMZPumpOutletEnum.optional(),
          has_chemical_roof_bar: z.boolean().default(false),
        }),
      ])
      .superRefine((data, ctx) => {
        // Check if OMZ pump selected but outlet is not
        if (data.has_omz_pump && data.pump_outlet_omz === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: genericRequiredMessage,
            path: ["pump_outlet_omz"],
          });
          return;
        }

        // Check chemical roof bar dependency
        if (data.has_chemical_roof_bar) {
          // Allow chemical bar only if outlet includes HP_ROOF_BAR
          const outletAllowsChemBar =
            data.pump_outlet_omz === OMZPumpOutletEnum.enum.HP_ROOF_BAR ||
            data.pump_outlet_omz ===
              OMZPumpOutletEnum.enum.HP_ROOF_BAR_SPINNERS;
          if (!outletAllowsChemBar) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                "Barra nebulizzazione disponibile solo con barra oscillante.",
              path: ["has_chemical_roof_bar"],
            });
          }
        }
      })
  );

// --- Final Combined Schema ---
export const hpPumpSchema = hpPump15kwDiscriminatedUnion
  .and(hpPump30kwDiscriminatedUnion) // Merge 30kW logic
  .and(hpPumpOmzDiscriminatedUnion) // Merge OMZ logic
  .superRefine((data, ctx) => {
    // Final check: cannot have both 15kW and 30kW pumps
    if (data.has_15kw_pump && data.has_30kw_pump) {
      // Add issue to both checkboxes
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Non puoi selezionare entrambe le pompe (15kW e 30kW)",
        path: ["has_15kw_pump"],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Non puoi selezionare entrambe le pompe (15kW e 30kW)",
        path: ["has_30kw_pump"],
      });
    }
  });

export type HPPumpSchema = z.infer<typeof hpPumpSchema>;
