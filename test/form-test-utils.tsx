import React from "react";
import { render } from "@testing-library/react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ConfigSchema, configDefaults, configSchema, UpdateConfigSchema } from "@/validation/config-schema";

// --- Reusable Radix Select interaction ---

/**
 * Opens a Radix Select by its label text and clicks an option.
 * Uses role="option" to avoid duplicate text matches (Radix renders
 * both a hidden native <select> and a popover with the same labels).
 */
export async function selectRadixOption(labelText: string, optionText: string) {
  const trigger = screen.getByLabelText(labelText);
  await userEvent.click(trigger);
  const options = screen.getAllByRole("option", { name: optionText });
  await userEvent.click(options[0]);
}

// --- Config form test data ---

export function makeValidConfig(overrides: Partial<UpdateConfigSchema> = {}): UpdateConfigSchema {
  return {
    user_id: "test-user-123",
    name: "Test Config",
    machine_type: "STD",
    description: "",
    brush_qty: 0,
    brush_type: undefined,
    brush_color: undefined,
    has_chemical_pump: false,
    chemical_qty: undefined,
    chemical_pump_pos: undefined,
    has_foam: false,
    has_acid_pump: false,
    acid_pump_pos: undefined,
    has_shampoo_pump: false,
    has_wax_pump: false,
    water_1_type: "NETWORK",
    water_1_pump: undefined,
    water_2_type: undefined,
    water_2_pump: undefined,
    has_antifreeze: false,
    inv_pump_outlet_dosatron_qty: 0,
    inv_pump_outlet_pw_qty: 0,
    supply_type: "STRAIGHT_SHELF",
    supply_side: "LEFT",
    supply_fixing_type: undefined,
    has_post_frame: false,
    rail_type: "DOWELED",
    rail_length: 21,
    rail_guide_qty: 0,
    dowel_type: "ZINCATO",
    has_15kw_pump: false,
    pump_outlet_1_15kw: undefined,
    pump_outlet_2_15kw: undefined,
    has_30kw_pump: false,
    pump_outlet_1_30kw: undefined,
    pump_outlet_2_30kw: undefined,
    has_omz_pump: false,
    pump_outlet_omz: undefined,
    has_chemical_roof_bar: false,
    touch_qty: 1,
    touch_pos: "EXTERNAL",
    touch_fixing_type: "WALL",
    has_itecoweb: false,
    has_card_reader: false,
    card_qty: 0,
    is_fast: false,
    ...overrides,
  } as UpdateConfigSchema;
}

// --- Config form wrapper with Zod validation ---

/**
 * Renders children inside a FormProvider with the configSchema resolver.
 * Returns getValues for inspecting form state.
 */
export function renderWithConfigFormProvider(
  overrides: Partial<ConfigSchema> = {},
  children: React.ReactNode,
) {
  let getValues: () => ConfigSchema;

  const Wrapper = () => {
    const form = useForm<ConfigSchema>({
      resolver: zodResolver(configSchema),
      defaultValues: { ...configDefaults, ...overrides } as ConfigSchema,
    });
    getValues = form.getValues;
    return (
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(() => { })}>
          {children}
        </form>
      </FormProvider>
    );
  };

  const result = render(<Wrapper />);
  return { ...result, getValues: () => getValues() };
}
