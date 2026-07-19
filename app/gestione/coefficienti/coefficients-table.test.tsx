// @vitest-environment jsdom

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// The create dialog mounts PartNumberCombobox, which imports a server action
// that pulls in @/db (needs DATABASE_URL). Stub it — the combobox never opens
// in these tests.
vi.mock("@/app/actions/engineering-bom-actions", () => ({
  searchPartNumbersAction: vi
    .fn()
    .mockResolvedValue({ success: true, data: [] }),
}));

const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockReset = vi.fn();
const mockCreate = vi.fn();
const mockSync = vi.fn();
vi.mock("@/app/actions/coefficient-actions", () => ({
  updateCoefficientAction: (...a: unknown[]) => mockUpdate(...a),
  deleteCoefficientAction: (...a: unknown[]) => mockDelete(...a),
  resetCoefficientAction: (...a: unknown[]) => mockReset(...a),
  createCoefficientAction: (...a: unknown[]) => mockCreate(...a),
  syncMaxBomCoefficientsAction: (...a: unknown[]) => mockSync(...a),
}));

import type { PriceCoefficientWithUpdater } from "@/db/queries";
import CoefficientsTable from "./coefficients-table";

function makeRow(
  overrides: Partial<PriceCoefficientWithUpdater> = {},
): PriceCoefficientWithUpdater {
  return {
    id: 1,
    pn: "AAA-100",
    description: "Brush motor",
    cost: "10.00",
    coefficient: "1.50",
    source: "MANUAL",
    is_custom: false,
    updated_by: null,
    updaterEmail: null,
    updaterInitials: null,
    created_at: new Date("2026-01-01"),
    updated_at: new Date("2026-01-02"),
    ...overrides,
  };
}

const ROWS: PriceCoefficientWithUpdater[] = [
  makeRow({
    id: 1,
    pn: "AAA-100",
    description: "Brush motor",
    source: "MANUAL",
  }),
  makeRow({
    id: 2,
    pn: "BBB-200",
    description: "Pump seal",
    source: "MAXBOM",
    is_custom: true,
  }),
  makeRow({
    id: 3,
    pn: "CCC-300",
    description: "Rail bracket",
    source: "MAXBOM",
    is_custom: false,
  }),
];

function renderTable() {
  return render(
    <CoefficientsTable
      rows={ROWS}
      missingMaxBomPns={[]}
      orphanPns={[]}
      defaultCoefficient={1}
    />,
  );
}

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("CoefficientsTable — client-side text filter", () => {
  test("shows every row before filtering", () => {
    renderTable();
    expect(screen.getByText("AAA-100")).toBeInTheDocument();
    expect(screen.getByText("BBB-200")).toBeInTheDocument();
    expect(screen.getByText("CCC-300")).toBeInTheDocument();
  });

  test("filters by part number (case-insensitive)", async () => {
    renderTable();
    await userEvent.type(
      screen.getByLabelText("Cerca per codice o descrizione"),
      "bbb",
    );

    expect(screen.queryByText("AAA-100")).not.toBeInTheDocument();
    expect(screen.getByText("BBB-200")).toBeInTheDocument();
    expect(screen.queryByText("CCC-300")).not.toBeInTheDocument();
  });

  test("filters by description", async () => {
    renderTable();
    await userEvent.type(
      screen.getByLabelText("Cerca per codice o descrizione"),
      "seal",
    );

    expect(screen.getByText("BBB-200")).toBeInTheDocument();
    expect(screen.queryByText("AAA-100")).not.toBeInTheDocument();
  });

  test("shows the empty state when nothing matches", async () => {
    renderTable();
    await userEvent.type(
      screen.getByLabelText("Cerca per codice o descrizione"),
      "zzz-nope",
    );

    expect(
      screen.getByText("Nessun coefficiente trovato."),
    ).toBeInTheDocument();
    expect(screen.queryByText("AAA-100")).not.toBeInTheDocument();
  });

  test("combines the source chip with the text filter", async () => {
    renderTable();
    // "Manuali" chip narrows to MANUAL rows (only AAA-100)...
    await userEvent.click(screen.getByRole("button", { name: "Manuali" }));
    expect(screen.getByText("AAA-100")).toBeInTheDocument();
    expect(screen.queryByText("BBB-200")).not.toBeInTheDocument();

    // ...and a non-matching search then empties it.
    await userEvent.type(
      screen.getByLabelText("Cerca per codice o descrizione"),
      "bbb",
    );
    expect(screen.queryByText("AAA-100")).not.toBeInTheDocument();
    expect(
      screen.getByText("Nessun coefficiente trovato."),
    ).toBeInTheDocument();
  });
});

describe("CoefficientsTable — shared row dialogs", () => {
  test("opens a single shared edit dialog targeting the selected row", async () => {
    renderTable();

    const firstRowMenu = screen.getAllByLabelText("Apri azioni")[0];
    await userEvent.click(firstRowMenu);
    await userEvent.click(await screen.findByText("Modifica coefficiente"));

    // The shared dialog carries the selected row's PN — and only one exists.
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText("Modifica coefficiente — AAA-100"),
    ).toBeInTheDocument();
  });

  test("confirming a delete calls the action for the selected row", async () => {
    mockDelete.mockResolvedValue({ success: true });
    renderTable();

    // BBB-200 (custom MAXBOM) is not deletable; CCC-300 default MAXBOM is not
    // deletable; AAA-100 (MANUAL) is. Open its menu.
    const firstRowMenu = screen.getAllByLabelText("Apri azioni")[0];
    await userEvent.click(firstRowMenu);
    await userEvent.click(await screen.findByText("Elimina coefficiente"));

    await userEvent.click(
      await screen.findByRole("button", { name: "Elimina" }),
    );

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith("AAA-100"));
  });
});
