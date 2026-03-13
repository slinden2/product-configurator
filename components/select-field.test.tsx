// @vitest-environment jsdom
import React from "react";
import { describe, test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import SelectField from "@/components/select-field";
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

// --- Helper ---

function renderSelectField({
  props,
  defaults = {},
}: {
  props?: Partial<React.ComponentProps<typeof SelectField<TestForm>>>;
  defaults?: Partial<TestForm>;
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
        <SelectField<TestForm>
          name="color"
          label="Color"
          dataType="string"
          items={colorItems}
          {...props}
        />
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
        props: { name: "count", label: "Size", dataType: "number", items: numberItems },
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
            { triggerValue: "red", fieldsToReset: ["related"], invertTrigger: true },
          ],
        },
        defaults: { related: "initial" },
      });

      await selectOption("Color", "Blue");

      expect(getValues().related).toBeUndefined();
    });
  });
});
