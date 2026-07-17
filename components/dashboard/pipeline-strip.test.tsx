// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { UserData } from "@/db/queries";
import type { Role } from "@/types";

// --- Mocks (references defined before vi.mock factories run) ---
const mockGetOfferRevisionQueueCounts = vi.fn();
const mockGetConfigTechnicalQueueCounts = vi.fn();

vi.mock("@/db/queries", () => ({
  getOfferRevisionQueueCounts: () => mockGetOfferRevisionQueueCounts(),
  getConfigTechnicalQueueCounts: () => mockGetConfigTechnicalQueueCounts(),
}));

import { PipelineStrip } from "./pipeline-strip";

const makeUser = (role: Role) =>
  ({
    id: "u1",
    email: "test@itecosrl.com",
    role,
    initials: null,
    manager_id: null,
  }) as NonNullable<UserData>;

const renderStrip = async (role: Role) =>
  render(await PipelineStrip({ user: makeUser(role) }));

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetOfferRevisionQueueCounts.mockResolvedValue([
    { status: "DRAFT", count: 3, oldestDate: null },
  ]);
  mockGetConfigTechnicalQueueCounts.mockResolvedValue([
    { status: "IN_TECH_REVIEW", count: 6, oldestDate: null },
  ]);
});

describe("PipelineStrip role matrix", () => {
  test.each([
    "SALES",
    "SALES_MANAGER",
    "SALES_DIRECTOR",
  ] as const)("%s sees only the Offerte row", async (role) => {
    await renderStrip(role);

    expect(screen.getByText("Offerte")).toBeInTheDocument();
    expect(screen.queryByText("Configurazioni")).not.toBeInTheDocument();
    expect(mockGetConfigTechnicalQueueCounts).not.toHaveBeenCalled();
  });

  test("ENGINEER sees only the Configurazioni row", async () => {
    await renderStrip("ENGINEER");

    expect(screen.getByText("Configurazioni")).toBeInTheDocument();
    expect(screen.queryByText("Offerte")).not.toBeInTheDocument();
    expect(mockGetOfferRevisionQueueCounts).not.toHaveBeenCalled();
  });

  test("ADMIN sees both rows", async () => {
    await renderStrip("ADMIN");

    expect(screen.getByText("Offerte")).toBeInTheDocument();
    expect(screen.getByText("Configurazioni")).toBeInTheDocument();
  });
});
