// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import {
  type FieldPath,
  FormProvider,
  type Resolver,
  type ResolverResult,
  type UseFormProps,
  type UseFormReturn,
  useForm,
} from "react-hook-form";
import { afterEach, describe, expect, test } from "vitest";
import CheckboxField from "@/components/checkbox-field";
import { FormDisabledContext } from "@/components/shared/form-disabled-context";

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
  formDisabled = false,
  formOptions = {},
}: {
  props?: Partial<React.ComponentProps<typeof CheckboxField<TestForm>>>;
  defaults?: Partial<TestForm>;
  formDisabled?: boolean;
  formOptions?: Pick<UseFormProps<TestForm>, "resolver" | "mode">;
} = {}) {
  let formApi: UseFormReturn<TestForm>;

  const Wrapper = () => {
    const form = useForm<TestForm>({
      defaultValues: { enabled: false, related: undefined, ...defaults },
      ...formOptions,
    });
    formApi = form;
    return (
      <FormProvider {...form}>
        <FormDisabledContext.Provider value={formDisabled}>
          <CheckboxField<TestForm>
            name="enabled"
            label="Enable feature"
            {...props}
          />
        </FormDisabledContext.Provider>
      </FormProvider>
    );
  };

  render(<Wrapper />);
  return {
    getValues: () => formApi.getValues(),
    getFieldState: (name: FieldPath<TestForm>) => formApi.getFieldState(name),
  };
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

    test("disables the checkbox when the form-wide disabled context is set", () => {
      renderCheckboxField({ formDisabled: true });

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

    test("resets fields to the configured resetToValue", async () => {
      const { getValues } = renderCheckboxField({
        props: {
          fieldsToResetOnUncheck: [
            { fieldsToReset: ["related"], resetToValue: "fallback" },
          ],
        },
        defaults: { enabled: true, related: "initial" },
      });

      await userEvent.click(screen.getByRole("checkbox"));

      expect(getValues().related).toBe("fallback");
    });
  });

  describe("Revalidate on check", () => {
    test("revalidates dependent fields on check, clearing stale errors", async () => {
      const resolver: Resolver<TestForm> = async (
        values,
      ): Promise<ResolverResult<TestForm>> => {
        if (!values.enabled) {
          return {
            values: {},
            errors: {
              related: { type: "custom", message: "Related is invalid" },
            },
          };
        }
        return { values, errors: {} };
      };
      const { getFieldState } = renderCheckboxField({
        props: {
          fieldsToResetOnUncheck: [{ fieldsToReset: ["related"] }],
        },
        defaults: { enabled: true, related: "initial" },
        formOptions: { resolver },
      });
      const checkbox = screen.getByRole("checkbox");

      // Unchecking resets `related` with shouldValidate, which records the error
      await userEvent.click(checkbox);

      await waitFor(() => expect(getFieldState("related").error).toBeDefined());

      // Re-checking revalidates `related`, clearing the now-stale error
      await userEvent.click(checkbox);

      await waitFor(() =>
        expect(getFieldState("related").error).toBeUndefined(),
      );
    });
  });

  describe("Validation display", () => {
    test("shows the field's own validation error via FormMessage", async () => {
      const resolver: Resolver<TestForm> = async (
        values,
      ): Promise<ResolverResult<TestForm>> => {
        if (!values.enabled) {
          return {
            values: {},
            errors: {
              enabled: { type: "custom", message: "Must stay enabled" },
            },
          };
        }
        return { values, errors: {} };
      };
      renderCheckboxField({
        defaults: { enabled: true },
        formOptions: { resolver, mode: "onChange" },
      });

      await userEvent.click(screen.getByRole("checkbox"));

      expect(await screen.findByText("Must stay enabled")).toBeInTheDocument();
    });
  });
});
