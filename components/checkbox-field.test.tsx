// @vitest-environment jsdom
import type React from "react";
import { describe, test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import CheckboxField from "@/components/checkbox-field";

afterEach(cleanup);

// --- Test Form ---

interface TestForm {
  enabled: boolean;
  related: string | undefined;
}

// --- Helper ---

function renderCheckboxField({
  props,
  defaults = {},
}: {
  props?: Partial<React.ComponentProps<typeof CheckboxField<TestForm>>>;
  defaults?: Partial<TestForm>;
} = {}) {
  let getValues: () => TestForm;

  const Wrapper = () => {
    const form = useForm<TestForm>({
      defaultValues: { enabled: false, related: undefined, ...defaults },
    });
    getValues = form.getValues;
    return (
      <FormProvider {...form}>
        <CheckboxField<TestForm>
          name="enabled"
          label="Enable feature"
          {...props}
        />
      </FormProvider>
    );
  };

  render(<Wrapper />);
  return { getValues: () => getValues() };
}

// --- Tests ---

describe("CheckboxField", () => {
  describe("Rendering", () => {
    test("renders label", () => {
      renderCheckboxField();

      expect(screen.getByText("Enable feature")).toBeInTheDocument();
    });

    test("renders description when provided", () => {
      renderCheckboxField({ props: { description: "Toggle this setting" } });

      expect(screen.getByText("Toggle this setting")).toBeInTheDocument();
    });

    test("disables the checkbox when disabled prop is true", () => {
      renderCheckboxField({ props: { disabled: true } });

      expect(screen.getByRole("checkbox")).toBeDisabled();
    });
  });

  describe("Value handling", () => {
    test("stores true when checked", async () => {
      const { getValues } = renderCheckboxField();

      await userEvent.click(screen.getByRole("checkbox"));

      expect(getValues().enabled).toBe(true);
    });

    test("stores false when unchecked", async () => {
      const { getValues } = renderCheckboxField({
        defaults: { enabled: true },
      });

      await userEvent.click(screen.getByRole("checkbox"));

      expect(getValues().enabled).toBe(false);
    });
  });

  describe("Reset on uncheck", () => {
    test("resets fields when unchecked", async () => {
      const { getValues } = renderCheckboxField({
        props: {
          fieldsToResetOnUncheck: [{ fieldsToReset: ["related"] }],
        },
        defaults: { enabled: true, related: "initial" },
      });

      await userEvent.click(screen.getByRole("checkbox"));

      expect(getValues().enabled).toBe(false);
      expect(getValues().related).toBeUndefined();
    });

    test("does NOT reset fields when checked", async () => {
      const { getValues } = renderCheckboxField({
        props: {
          fieldsToResetOnUncheck: [{ fieldsToReset: ["related"] }],
        },
        defaults: { enabled: false, related: "initial" },
      });

      await userEvent.click(screen.getByRole("checkbox"));

      expect(getValues().enabled).toBe(true);
      expect(getValues().related).toBe("initial");
    });
  });
});
