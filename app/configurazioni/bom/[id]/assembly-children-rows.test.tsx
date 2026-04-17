// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks (before vi.mock) ---

const mockGetAssemblyChildrenAction = vi.fn();

vi.mock("@/app/actions/bom-lines-actions", () => ({
  getAssemblyChildrenAction: (...args: unknown[]) =>
    mockGetAssemblyChildrenAction(...args),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// --- Import SUT after mocks ---

import { toast } from "sonner";
import { Table, TableBody } from "@/components/ui/table";
import { MSG } from "@/lib/messages";
import { AssemblyChildrenRows } from "./assembly-children-rows";

// --- Helpers ---

function renderRows(parentPn: string, columnCount = 4) {
  return render(
    <Table>
      <TableBody>
        <AssemblyChildrenRows
          parentPn={parentPn}
          depth={1}
          columnCount={columnCount}
        />
      </TableBody>
    </Table>,
  );
}

const PART_CHILD = {
  pn: "PART-001",
  description: "A plain part",
  qty: 3,
  sort_order: 1,
  pn_type: "PART" as const,
  is_phantom: false,
};

const ASSY_CHILD = {
  pn: "ASSY-001",
  description: "A sub-assembly",
  qty: 1,
  sort_order: 2,
  pn_type: "ASSY" as const,
  is_phantom: false,
};

// --- Tests ---

afterEach(() => {
  cleanup();
});

describe("AssemblyChildrenRows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("shows spinner while loading, then renders children", async () => {
    mockGetAssemblyChildrenAction.mockResolvedValue({
      success: true,
      data: [PART_CHILD],
    });

    renderRows("PARENT-001");

    // Spinner should be visible immediately
    expect(screen.getByRole("status")).toBeInTheDocument();

    // After load, child row appears
    await waitFor(() => {
      expect(screen.getByText("PART-001")).toBeInTheDocument();
    });
    expect(screen.getByText("A plain part")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  test("renders chevron only for ASSY children, not PART children", async () => {
    mockGetAssemblyChildrenAction.mockResolvedValue({
      success: true,
      data: [PART_CHILD, ASSY_CHILD],
    });

    renderRows("PARENT-001");

    await waitFor(() => {
      expect(screen.getByText("ASSY-001")).toBeInTheDocument();
    });

    // Only one expand button (for ASSY-001)
    const expandButtons = screen.queryAllByTitle("Espandi");
    expect(expandButtons).toHaveLength(1);
  });

  test("clicking an ASSY chevron loads and shows nested children", async () => {
    mockGetAssemblyChildrenAction
      .mockResolvedValueOnce({ success: true, data: [ASSY_CHILD] })
      .mockResolvedValueOnce({
        success: true,
        data: [{ ...PART_CHILD, pn: "NESTED-001", description: "Nested part" }],
      });

    renderRows("PARENT-001");

    await waitFor(() => {
      expect(screen.getByText("ASSY-001")).toBeInTheDocument();
    });

    const expandBtn = screen.getByTitle("Espandi");
    await userEvent.click(expandBtn);

    // Second action called with the ASSY child's PN
    expect(mockGetAssemblyChildrenAction).toHaveBeenCalledWith("ASSY-001");

    await waitFor(() => {
      expect(screen.getByText("NESTED-001")).toBeInTheDocument();
    });
  });

  test("clicking the chevron again collapses the nested children", async () => {
    mockGetAssemblyChildrenAction
      .mockResolvedValueOnce({ success: true, data: [ASSY_CHILD] })
      .mockResolvedValueOnce({
        success: true,
        data: [{ ...PART_CHILD, pn: "NESTED-001", description: "Nested part" }],
      });

    renderRows("PARENT-001");

    await waitFor(() => {
      expect(screen.getByText("ASSY-001")).toBeInTheDocument();
    });

    // Expand
    const expandBtn = screen.getByTitle("Espandi");
    await userEvent.click(expandBtn);

    await waitFor(() => {
      expect(screen.getByText("NESTED-001")).toBeInTheDocument();
    });

    // Button title switches to "Comprimi" once expanded
    const collapseBtn = screen.getByTitle("Comprimi");

    // Collapse
    await userEvent.click(collapseBtn);

    // Nested row disappears and button reverts to "Espandi"
    expect(screen.queryByText("NESTED-001")).not.toBeInTheDocument();
    expect(screen.getByTitle("Espandi")).toBeInTheDocument();
  });

  test("shows error toast and renders nothing on action failure", async () => {
    mockGetAssemblyChildrenAction.mockResolvedValue({
      success: false,
      error: "DB error",
    });

    renderRows("PARENT-001");

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(MSG.toast.subBomLoadFailed);
    });

    // No child rows rendered after failure
    expect(screen.queryByRole("row")).toBeNull();
  });

  test("renders empty without rows when action returns empty data", async () => {
    mockGetAssemblyChildrenAction.mockResolvedValue({
      success: true,
      data: [],
    });

    renderRows("PARENT-001");

    await waitFor(() => {
      // Spinner disappears
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    expect(screen.queryByRole("row")).toBeNull();
  });

  test("renders empty Azioni cell when columnCount is 5", async () => {
    mockGetAssemblyChildrenAction.mockResolvedValue({
      success: true,
      data: [PART_CHILD],
    });

    renderRows("PARENT-001", 5);

    await waitFor(() => {
      expect(screen.getByText("PART-001")).toBeInTheDocument();
    });

    // 5-column row: POS (hidden sm), Codice, Descrizione, Qtà, Azioni (empty)
    const cells = document.querySelectorAll("td");
    expect(cells.length).toBe(5);
  });
});
