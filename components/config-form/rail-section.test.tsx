// @vitest-environment jsdom

import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import RailSection from "@/components/config-form/rail-section";
import { renderWithConfigFormProvider } from "@/test/form-test-utils";
import type { ConfigSchema } from "@/validation/config-schema";

afterEach(cleanup);

const renderRailSection = (overrides: Partial<ConfigSchema> = {}) =>
  renderWithConfigFormProvider(<RailSection />, overrides);

describe("RailSection", () => {
  test("renders section title and all three select fields", () => {
    renderRailSection();

    expect(screen.getByText("Rotaie")).toBeInTheDocument();
    expect(screen.getByText("Tipo di rotaie")).toBeInTheDocument();
    expect(screen.getByText("Lunghezza rotaie")).toBeInTheDocument();
    expect(screen.getByText("Guida ruote")).toBeInTheDocument();
  });
});
