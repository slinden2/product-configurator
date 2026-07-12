// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import {
  FormProvider,
  type Resolver,
  type ResolverResult,
  useForm,
} from "react-hook-form";
import { afterEach, describe, expect, test } from "vitest";
import SelectField from "@/components/select-field";
import { FormDisabledContext } from "@/components/shared/form-disabled-context";
import { NOT_SELECTED_LABEL, NOT_SELECTED_VALUE } from "@/lib/utils";
import type { SelectOption } from "@/types";

afterEach(cleanup);

// --- Test Form ---

interface TestForm {
  color: string | undefined;
  count: number | undefined;
  active: boolean | undefined;
  related: string | undefined;
}

const colorItems: SelectOption[] = [
  { value: "red", label: "Red" },
  { value: "blue", label: "Blue" },
];

const colorItemsWithEmpty: SelectOption[] = [
  { value: NOT_SELECTED_VALUE, label: NOT_SELECTED_LABEL },
  ...colorItems,
];

const numberItems: SelectOption[] = [
  { value: 1, label: "Small" },
  { value: 5, label: "Large" },
];

const booleanItems: SelectOption[] = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

// --- Helper ---

function renderSelectField({
  props,
  defaults = {},
  formDisabled = false,
}: {
  props?: Partial<React.ComponentProps<typeof SelectField<TestForm>>>;
  defaults?: Partial<TestForm>;
  formDisabled?: boolean;
} = {}) {
  let getValues: () => TestForm;

  const Wrapper = () => {
    const form = useForm<TestForm>({
      defaultValues: {
        color: undefined,
        count: undefined,
        active: undefined,
        related: undefined,
        ...defaults,
      },
    });
    getValues = form.getValues;
    return (
      <FormProvider {...form}>
        <FormDisabledContext.Provider value={formDisabled}>
          <SelectField<TestForm>
            name="color"
            label="Color"
            dataType="string"
            items={colorItems}
            {...props}
          />
        </FormDisabledContext.Provider>
      </FormProvider>
    );
  };

  render(<Wrapper />);
  return { getValues: () => getValues() };
}

async function selectOption(labelText: string, optionText: string) {
  const trigger = screen.getByLabelText(labelText);
  await userEvent.click(trigger);
  await userEvent.click(screen.getByText(optionText));
}

// --- Tests ---

describe("SelectField", () => {
  describe("Rendering", () => {
    test("renders label and placeholder", () => {
      renderSelectField();

      expect(screen.getByText("Color")).toBeInTheDocument();
      expect(screen.getByText(NOT_SELECTED_LABEL)).toBeInTheDocument();
    });

    test("renders description when provided", () => {
      renderSelectField({ props: { description: "Pick a color" } });

      expect(screen.getByText("Pick a color")).toBeInTheDocument();
    });

    test("disables the select when disabled prop is true", () => {
      renderSelectField({ props: { disabled: true } });

      expect(screen.getByLabelText("Color")).toBeDisabled();
    });

    test("disables the select when the form-wide disabled context is set", () => {
      renderSelectField({ formDisabled: true });

      expect(screen.getByLabelText("Color")).toBeDisabled();
    });

    test("shows the placeholder after the selection is cleared", async () => {
      renderSelectField({
        props: { items: colorItemsWithEmpty },
        defaults: { color: "red" },
      });

      expect(screen.getByLabelText("Color")).toHaveTextContent("Red");

      await selectOption("Color", NOT_SELECTED_LABEL);

      expect(screen.getByLabelText("Color")).toHaveTextContent(
        NOT_SELECTED_LABEL,
      );
      expect(screen.getByLabelText("Color")).not.toHaveTextContent("Red");
    });
  });

  describe("Type conversion", () => {
    test("stores a string value when dataType is string", async () => {
      const { getValues } = renderSelectField();

      await selectOption("Color", "Red");

      expect(getValues().color).toBe("red");
      expect(typeof getValues().color).toBe("string");
    });

    test("stores a number value when dataType is number", async () => {
      const { getValues } = renderSelectField({
        props: {
          name: "count",
          label: "Size",
          dataType: "number",
          items: numberItems,
        },
      });

      await selectOption("Size", "Large");

      expect(getValues().count).toBe(5);
      expect(typeof getValues().count).toBe("number");
    });

    test("stores undefined when NOT_SELECTED_VALUE is chosen", async () => {
      const { getValues } = renderSelectField({
        props: { items: colorItemsWithEmpty },
        defaults: { color: "red" },
      });

      await selectOption("Color", NOT_SELECTED_LABEL);

      expect(getValues().color).toBeUndefined();
    });

    test("stores a boolean value when dataType is boolean", async () => {
      const { getValues } = renderSelectField({
        props: {
          name: "active",
          label: "Active",
          dataType: "boolean",
          items: booleanItems,
        },
      });

      await selectOption("Active", "Yes");

      expect(getValues().active).toBe(true);

      await selectOption("Active", "No");

      expect(getValues().active).toBe(false);
    });

    test("stores undefined when the value cannot be parsed as a number", async () => {
      const { getValues } = renderSelectField({
        props: {
          name: "count",
          label: "Size",
          dataType: "number",
          items: [{ value: "not-a-number", label: "Broken" }],
        },
        defaults: { count: 5 },
      });

      await selectOption("Size", "Broken");

      expect(getValues().count).toBeUndefined();
    });
  });

  describe("Field reset logic", () => {
    test("resets fields when triggerValue matches", async () => {
      const { getValues } = renderSelectField({
        props: {
          fieldsToResetOnValue: [
            { triggerValue: "red", fieldsToReset: ["related"] },
          ],
        },
        defaults: { related: "initial" },
      });

      await selectOption("Color", "Red");

      expect(getValues().related).toBeUndefined();
    });

    test("resets fields with invertTrigger when value does NOT match", async () => {
      const { getValues } = renderSelectField({
        props: {
          fieldsToResetOnValue: [
            {
              triggerValue: "red",
              fieldsToReset: ["related"],
              invertTrigger: true,
            },
          ],
        },
        defaults: { related: "initial" },
      });

      await selectOption("Color", "Blue");

      expect(getValues().related).toBeUndefined();
    });

    test("does NOT reset fields when triggerValue does not match", async () => {
      const { getValues } = renderSelectField({
        props: {
          fieldsToResetOnValue: [
            { triggerValue: "red", fieldsToReset: ["related"] },
          ],
        },
        defaults: { related: "initial" },
      });

      await selectOption("Color", "Blue");

      expect(getValues().related).toBe("initial");
    });

    test("resets fields to the configured resetToValue", async () => {
      const { getValues } = renderSelectField({
        props: {
          fieldsToResetOnValue: [
            {
              triggerValue: "red",
              fieldsToReset: ["related"],
              resetToValue: "fallback",
            },
          ],
        },
        defaults: { related: "initial" },
      });

      await selectOption("Color", "Red");

      expect(getValues().related).toBe("fallback");
    });

    test("resets fields when the value matches any entry of a triggerValue array", async () => {
      const { getValues } = renderSelectField({
        props: {
          name: "count",
          label: "Size",
          dataType: "number",
          items: numberItems,
          fieldsToResetOnValue: [
            { triggerValue: [1, 5], fieldsToReset: ["related"] },
          ],
        },
        defaults: { related: "initial" },
      });

      await selectOption("Size", "Large");

      expect(getValues().related).toBeUndefined();
    });
  });

  describe("Revalidation", () => {
    test("revalidates fields listed in fieldsToRevalidate on change", async () => {
      const resolver: Resolver<TestForm> = async (
        values,
      ): Promise<ResolverResult<TestForm>> => {
        if (values.color === "red") {
          return {
            values: {},
            errors: {
              related: { type: "custom", message: "Related is invalid" },
            },
          };
        }
        return { values, errors: {} };
      };

      const Wrapper = () => {
        const form = useForm<TestForm>({
          resolver,
          defaultValues: {
            color: undefined,
            count: undefined,
            active: undefined,
            related: "initial",
          },
        });
        return (
          <FormProvider {...form}>
            <SelectField<TestForm>
              name="color"
              label="Color"
              dataType="string"
              items={colorItems}
              fieldsToRevalidate={["related"]}
            />
            <SelectField<TestForm>
              name="related"
              label="Related"
              dataType="string"
              items={[{ value: "initial", label: "Initial" }]}
            />
          </FormProvider>
        );
      };
      render(<Wrapper />);

      await selectOption("Color", "Red");

      expect(await screen.findByText("Related is invalid")).toBeInTheDocument();

      await selectOption("Color", "Blue");

      await waitFor(() =>
        expect(
          screen.queryByText("Related is invalid"),
        ).not.toBeInTheDocument(),
      );
    });

    test("does not strand an error from a cross-field rule that the reset resolves", async () => {
      // Rule: `related` may only be set when `color` is set. Clearing `color`
      // also resets `related`, so the rule ends up satisfied — the field must
      // not keep an error validated against the pre-reset `related` value.
      const resolver: Resolver<TestForm> = async (
        values,
      ): Promise<ResolverResult<TestForm>> => {
        if (!values.color && values.related) {
          return {
            values: {},
            errors: {
              color: { type: "custom", message: "Color is required" },
            },
          };
        }
        return { values, errors: {} };
      };

      const Wrapper = () => {
        const form = useForm<TestForm>({
          resolver,
          defaultValues: {
            color: "red",
            count: undefined,
            active: undefined,
            related: "initial",
          },
        });
        return (
          <FormProvider {...form}>
            <SelectField<TestForm>
              name="color"
              label="Color"
              dataType="string"
              items={colorItemsWithEmpty}
              fieldsToResetOnValue={[
                {
                  triggerValue: NOT_SELECTED_VALUE,
                  fieldsToReset: ["related"],
                },
              ]}
            />
          </FormProvider>
        );
      };
      render(<Wrapper />);

      await selectOption("Color", NOT_SELECTED_LABEL);

      await waitFor(() =>
        expect(screen.queryByText("Color is required")).not.toBeInTheDocument(),
      );
    });
  });
});
