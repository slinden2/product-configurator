// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { makeTestUser } from "@/test/user-test-utils";
import type { Role } from "@/types";

// --- Mocks (references defined before vi.mock factories run) ---
const mockGetOfferRevisionQueueCounts = vi.fn();
const mockGetConfigTechnicalQueueCounts = vi.fn();

vi.mock("@/db/queries", () => ({
  getOfferRevisionQueueCounts: () => mockGetOfferRevisionQueueCounts(),
  getConfigTechnicalQueueCounts: () => mockGetConfigTechnicalQueueCounts(),
}));

import { ActionQueuesSection } from "./action-queues-section";

const OFFER_CARD_TITLES = [
  "Bozze da completare",
  "Da approvare",
  "Da inviare",
  "In attesa di esito",
];
const TECHNICAL_CARD_TITLES = ["Da prendere in carico", "In lavorazione"];

const renderSection = async (role: Role) =>
  render(await ActionQueuesSection({ user: makeTestUser(role) }));

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetOfferRevisionQueueCounts.mockResolvedValue([
    { status: "DRAFT", count: 3, oldestDate: new Date("2026-07-01") },
    {
      status: "PENDING_APPROVAL",
      count: 2,
      oldestDate: new Date("2026-07-02"),
    },
    {
      status: "APPROVED_TO_SEND",
      count: 1,
      oldestDate: new Date("2026-07-03"),
    },
    { status: "SENT", count: 4, oldestDate: new Date("2026-07-04") },
  ]);
  mockGetConfigTechnicalQueueCounts.mockResolvedValue([
    { status: "SALES_APPROVED", count: 5, oldestDate: new Date("2026-07-05") },
    { status: "IN_TECH_REVIEW", count: 6, oldestDate: new Date("2026-07-06") },
    { status: "DRAFT", count: 9, oldestDate: new Date("2026-07-07") },
  ]);
});

describe("ActionQueuesSection role matrix", () => {
  test.each([
    "SALES",
    "SALES_MANAGER",
    "SALES_DIRECTOR",
  ] as const)("%s sees the 4 offer cards and no technical cards", async (role) => {
    await renderSection(role);

    for (const title of OFFER_CARD_TITLES) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    for (const title of TECHNICAL_CARD_TITLES) {
      expect(screen.queryByText(title)).not.toBeInTheDocument();
    }
    expect(mockGetConfigTechnicalQueueCounts).not.toHaveBeenCalled();
  });

  test("ENGINEER sees only the 2 technical cards", async () => {
    await renderSection("ENGINEER");

    for (const title of TECHNICAL_CARD_TITLES) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    for (const title of OFFER_CARD_TITLES) {
      expect(screen.queryByText(title)).not.toBeInTheDocument();
    }
    expect(mockGetOfferRevisionQueueCounts).not.toHaveBeenCalled();
  });

  test("ADMIN sees all 6 cards", async () => {
    await renderSection("ADMIN");

    for (const title of [...OFFER_CARD_TITLES, ...TECHNICAL_CARD_TITLES]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });
});

describe("ActionQueuesSection card content", () => {
  test("the Bozze card links to the DRAFT-filtered offer list with its count", async () => {
    await renderSection("SALES");

    const card = screen.getByText("Bozze da completare").closest("a");
    expect(card).toHaveAttribute("href", "/offerte?status=bozza");
    expect(card).toHaveTextContent("3");
  });

  test("the In lavorazione card links to the IN_TECH_REVIEW-filtered config list with its count", async () => {
    await renderSection("ENGINEER");

    const card = screen.getByText("In lavorazione").closest("a");
    expect(card).toHaveAttribute(
      "href",
      "/configurazioni?status=in-revisione-tecnica",
    );
    expect(card).toHaveTextContent("6");
  });

  test("the intake card derives from the SALES_APPROVED technical-queue bucket", async () => {
    await renderSection("ENGINEER");

    const card = screen.getByText("Da prendere in carico").closest("a");
    expect(card).toHaveAttribute(
      "href",
      "/configurazioni?status=approvato-vendite",
    );
    expect(card).toHaveTextContent("5");
  });
});
