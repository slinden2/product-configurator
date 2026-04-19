// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MSG } from "@/lib/messages";
import type { UpdateWashBaySchema } from "@/validation/wash-bay-schema";

// --- Mocks (before imports) ---

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockInsertWashBay = vi.fn();
const mockEditWashBay = vi.fn();
const mockDeleteWashBay = vi.fn();
vi.mock("@/app/actions/wash-bay-actions", () => ({
  insertWashBayAction: (...args: unknown[]) => mockInsertWashBay(...args),
  editWashBayAction: (...args: unknown[]) => mockEditWashBay(...args),
  deleteWashBayAction: (...args: unknown[]) => mockDeleteWashBay(...args),
}));

// --- Imports (after mocks) ---

import WashBayForm from "@/components/wash-bay-form";

// --- Test Data ---

function makeWashBay(
  overrides: Partial<UpdateWashBaySchema> = {},
): UpdateWashBaySchema {
  return {
    id: 20,
    configuration_id: 1,
    hp_lance_qty: 0,
    det_lance_qty: 0,
    hose_reel_hp_with_post_qty: 0,
    hose_reel_hp_without_post_qty: 0,
    hose_reel_det_with_post_qty: 0,
    hose_reel_det_without_post_qty: 0,
    hose_reel_hp_det_with_post_qty: 0,
    pressure_washer_type: undefined,
    pressure_washer_qty: undefined,
    has_gantry: false,
    energy_chain_width: undefined,
    has_shelf_extension: false,
    is_first_bay: false,
    has_bay_dividers: false,
    ...overrides,
  } as UpdateWashBaySchema;
}

// --- Setup ---

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mockInsertWashBay.mockResolvedValue({ success: true });
  mockEditWashBay.mockResolvedValue({ success: true });
  mockDeleteWashBay.mockResolvedValue({ success: true });
});

// --- Tests ---

describe("WashBayFields — ENERGY_CHAIN + WALL restrictions", () => {
  test("shows warning banner when ENERGY_CHAIN + WALL", () => {
    render(
      <WashBayForm
        confId={1}
        confStatus="DRAFT"
        userRole="ENGINEER"
        supplyType="ENERGY_CHAIN"
        supplyFixingType="WALL"
        washBay={makeWashBay({ has_gantry: true })}
        washBayIndex={1}
        onDelete={vi.fn()}
        onSaveSuccess={vi.fn()}
      />,
    );

    expect(
      screen.getByText(MSG.energyChainWall.washBayForm),
    ).toBeInTheDocument();
  });

  test("hides warning banner when ENERGY_CHAIN + POST", () => {
    render(
      <WashBayForm
        confId={1}
        confStatus="DRAFT"
        userRole="ENGINEER"
        supplyType="ENERGY_CHAIN"
        supplyFixingType="POST"
        washBay={makeWashBay({ has_gantry: true })}
        washBayIndex={1}
        onDelete={vi.fn()}
        onSaveSuccess={vi.fn()}
      />,
    );

    expect(
      screen.queryByText(MSG.energyChainWall.washBayForm),
    ).not.toBeInTheDocument();
  });

  test("non-EC fields are disabled when ENERGY_CHAIN + WALL", () => {
    render(
      <WashBayForm
        confId={1}
        confStatus="DRAFT"
        userRole="ENGINEER"
        supplyType="ENERGY_CHAIN"
        supplyFixingType="WALL"
        washBay={makeWashBay({ has_gantry: true })}
        washBayIndex={1}
        onDelete={vi.fn()}
        onSaveSuccess={vi.fn()}
      />,
    );

    // Radix Select renders a <button> for the trigger — check aria-disabled
    const hpLanceTrigger = screen
      .getByText("Linea trolley HP")
      .closest("div")
      ?.querySelector("button");
    expect(hpLanceTrigger).toHaveAttribute("data-disabled");

    const hoseReelTrigger = screen
      .getByText("HP con palo")
      .closest("div")
      ?.querySelector("button");
    expect(hoseReelTrigger).toHaveAttribute("data-disabled");
  });

  test("has_gantry remains enabled when ENERGY_CHAIN + WALL", () => {
    render(
      <WashBayForm
        confId={1}
        confStatus="DRAFT"
        userRole="ENGINEER"
        supplyType="ENERGY_CHAIN"
        supplyFixingType="WALL"
        washBay={makeWashBay({ has_gantry: false })}
        washBayIndex={1}
        onDelete={vi.fn()}
        onSaveSuccess={vi.fn()}
      />,
    );

    // Radix Checkbox.Root renders as button[role="checkbox"], accessible-named via FormLabel
    const hasGantryCheckbox = screen.getByRole("checkbox", {
      name: /pista con portale/i,
    });
    expect(hasGantryCheckbox).not.toHaveAttribute("data-disabled");
  });

  test("Catenaria fields are accessible when ENERGY_CHAIN + WALL + has_gantry", () => {
    render(
      <WashBayForm
        confId={1}
        confStatus="DRAFT"
        userRole="ENGINEER"
        supplyType="ENERGY_CHAIN"
        supplyFixingType="WALL"
        washBay={makeWashBay({ has_gantry: true })}
        washBayIndex={1}
        onDelete={vi.fn()}
        onSaveSuccess={vi.fn()}
      />,
    );

    expect(screen.getByText("Larghezza catena")).toBeInTheDocument();
    expect(
      screen.getByText("Con prolunga per mensola alim."),
    ).toBeInTheDocument();
  });

  test("non-EC fields are enabled when ENERGY_CHAIN + POST", () => {
    render(
      <WashBayForm
        confId={1}
        confStatus="DRAFT"
        userRole="ENGINEER"
        supplyType="ENERGY_CHAIN"
        supplyFixingType="POST"
        washBay={makeWashBay()}
        washBayIndex={1}
        onDelete={vi.fn()}
        onSaveSuccess={vi.fn()}
      />,
    );

    const hpLanceTrigger = screen
      .getByText("Linea trolley HP")
      .closest("div")
      ?.querySelector("button");
    expect(hpLanceTrigger).not.toHaveAttribute("data-disabled");
  });
});
