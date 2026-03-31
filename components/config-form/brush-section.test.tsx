// @vitest-environment jsdom
import React from "react";
import { describe, test, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { ConfigSchema, configDefaults } from "@/validation/config-schema";
import BrushSection from "@/components/config-form/brush-section";
import { NOT_SELECTED_LABEL } from "@/lib/utils";

afterEach(cleanup);

function renderBrushSection(overrides: Partial<ConfigSchema> = {}) {
  const Wrapper = () => {
    const form = useForm<ConfigSchema>({
      defaultValues: { ...configDefaults, ...overrides } as ConfigSchema,
    });
    return (
      <FormProvider {...form}>
        <BrushSection />
      </FormProvider>
    );
  };
  render(<Wrapper />);
}

describe("BrushSection", () => {
  test("renders all three select fields", () => {
    renderBrushSection();

    expect(screen.getByText("Numero di spazzole")).toBeInTheDocument();
    expect(screen.getByText("Tipo di setole")).toBeInTheDocument();
    expect(screen.getByText("Colore di setole")).toBeInTheDocument();
  });

  test("shows placeholder for brush quantity when value is undefined", () => {
    renderBrushSection({ brush_qty: undefined });

    // Find the label text
    const brushQtyLabel = screen.getByText(/numero di spazzole/i);

    // Add 'as HTMLElement' to satisfy TypeScript
    const container = brushQtyLabel.closest(".space-y-2") as HTMLElement;

    // Use 'within' to scope the search to that specific section
    expect(within(container).getByText(NOT_SELECTED_LABEL)).toBeInTheDocument();
  });

  test("brush type and color are disabled when brush quantity is undefined", () => {
    renderBrushSection({ brush_qty: undefined });

    expect(screen.getByLabelText("Tipo di setole")).toBeDisabled();
    expect(screen.getByLabelText("Colore di setole")).toBeDisabled();
  });

  test("brush type and color are disabled when brush quantity is 0", () => {
    renderBrushSection({ brush_qty: 0 });

    expect(screen.getByLabelText("Tipo di setole")).toBeDisabled();
    expect(screen.getByLabelText("Colore di setole")).toBeDisabled();
  });

  test("brush type and color are enabled when brush quantity is 2", () => {
    renderBrushSection({ brush_qty: 2 });

    expect(screen.getByLabelText("Tipo di setole")).not.toBeDisabled();
    expect(screen.getByLabelText("Colore di setole")).not.toBeDisabled();
  });

  test("brush type and color are enabled when brush quantity is 3", () => {
    renderBrushSection({ brush_qty: 3 });

    expect(screen.getByLabelText("Tipo di setole")).not.toBeDisabled();
    expect(screen.getByLabelText("Colore di setole")).not.toBeDisabled();
  });
});
