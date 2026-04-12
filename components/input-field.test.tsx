// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, describe, expect, test } from "vitest";
import InputField from "@/components/input-field";

afterEach(cleanup);

// --- Test Form ---

interface TestForm {
  title: string | undefined;
}

// --- Helper ---

function renderInputField({
  props,
  defaults = {},
}: {
  props?: Partial<React.ComponentProps<typeof InputField<TestForm>>>;
  defaults?: Partial<TestForm>;
} = {}) {
  let getValues: () => TestForm;

  const Wrapper = () => {
    const form = useForm<TestForm>({
      defaultValues: { title: undefined, ...defaults },
    });
    getValues = form.getValues;
    return (
      <FormProvider {...form}>
        <InputField<TestForm> name="title" label="Titolo" {...props} />
      </FormProvider>
    );
  };

  render(<Wrapper />);
  return { getValues: () => getValues() };
}

// --- Tests ---

describe("InputField", () => {
  describe("Rendering", () => {
    test("renders label", () => {
      renderInputField();

      expect(screen.getByText("Titolo")).toBeInTheDocument();
    });

    test("renders placeholder when provided", () => {
      renderInputField({ props: { placeholder: "Inserire il titolo" } });

      expect(
        screen.getByPlaceholderText("Inserire il titolo"),
      ).toBeInTheDocument();
    });

    test("disables the input when disabled prop is true", () => {
      renderInputField({ props: { disabled: true } });

      expect(screen.getByRole("textbox")).toBeDisabled();
    });
  });

  describe("Value handling", () => {
    test("stores typed text in form state", async () => {
      const { getValues } = renderInputField();

      await userEvent.type(screen.getByRole("textbox"), "Configurazione A");

      expect(getValues().title).toBe("Configurazione A");
    });

    test("defaults undefined value to empty string", () => {
      renderInputField();

      expect(screen.getByRole("textbox")).toHaveValue("");
    });
  });

  describe("Native props forwarding", () => {
    test("forwards autoComplete to the input element", () => {
      renderInputField({ props: { autoComplete: "email" } });

      expect(screen.getByRole("textbox")).toHaveAttribute(
        "autocomplete",
        "email",
      );
    });

    test("forwards maxLength to the input element", async () => {
      renderInputField({ props: { maxLength: 5 } });

      await userEvent.type(screen.getByRole("textbox"), "abcdefgh");

      expect(screen.getByRole("textbox")).toHaveValue("abcde");
    });
  });
});
