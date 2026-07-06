// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ConfigOrigin, ConfigurationStatusType } from "@/types";

// --- Mocks ---
// We exercise the REAL updateConfigStatus with the real edge table
// (canTransition / STATUS_TRANSITIONS) and the real gate helpers, so only the
// db connection is faked.
const mockConfigFindFirst = vi.fn();
const mockWashBaysFindMany = vi.fn();
const mockEbomFindFirst = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/db", () => ({
  db: {
    query: {
      configurations: {
        findFirst: (...args: unknown[]) => mockConfigFindFirst(...args),
      },
      washBays: {
        findMany: (...args: unknown[]) => mockWashBaysFindMany(...args),
      },
      engineeringBomItems: {
        findFirst: (...args: unknown[]) => mockEbomFindFirst(...args),
      },
      userProfiles: { findFirst: vi.fn() },
    },
    update: (...args: unknown[]) => mockUpdate(...args),
    select: vi.fn(),
  },
}));

import { QueryError, updateConfigStatus } from "@/db/queries";
import { MSG } from "@/lib/messages";

const CONF_ID = 1;

const engineer = {
  id: "eng-1",
  role: "ENGINEER",
  initials: "EN",
  manager_id: null,
} as unknown as Parameters<typeof updateConfigStatus>[1];

const makeConfig = (
  status: ConfigurationStatusType,
  overrides: Record<string, unknown> = {},
) => ({
  id: CONF_ID,
  user_id: "eng-1",
  origin: "STANDALONE" as ConfigOrigin,
  status,
  supply_type: "ENERGY_CHAIN",
  ...overrides,
});

const QUALIFYING_BAY = { id: 1, has_gantry: true, energy_chain_width: "200" };
const PLAIN_BAY = { id: 2, has_gantry: false, energy_chain_width: null };

beforeEach(() => {
  vi.clearAllMocks();
  // Engineering BOM exists by default.
  mockEbomFindFirst.mockResolvedValue({ id: 99 });
  mockWashBaysFindMany.mockResolvedValue([QUALIFYING_BAY]);
  // Final update chain: db.update().set().where().returning()
  mockUpdate.mockReturnValue({
    set: () => ({
      where: () => ({ returning: () => [{ id: CONF_ID }] }),
    }),
  });
});

describe("updateConfigStatus — standalone DRAFT -> TECH_APPROVED edge", () => {
  test("approves directly from DRAFT when both gates pass", async () => {
    mockConfigFindFirst.mockResolvedValue(makeConfig("DRAFT"));

    await expect(
      updateConfigStatus(CONF_ID, engineer, { status: "TECH_APPROVED" }),
    ).resolves.toEqual({ id: CONF_ID, fromStatus: "DRAFT" });
  });

  test("the BOM gate fires on the direct edge", async () => {
    mockConfigFindFirst.mockResolvedValue(makeConfig("DRAFT"));
    mockEbomFindFirst.mockResolvedValue(undefined);

    await expect(
      updateConfigStatus(CONF_ID, engineer, { status: "TECH_APPROVED" }),
    ).rejects.toThrow(new QueryError(MSG.config.approvedRequiresBom, 400));
  });

  test("the ENERGY_CHAIN wash-bay gate fires on the direct edge (forward move)", async () => {
    mockConfigFindFirst.mockResolvedValue(makeConfig("DRAFT"));
    mockWashBaysFindMany.mockResolvedValue([PLAIN_BAY]);

    await expect(
      updateConfigStatus(CONF_ID, engineer, { status: "TECH_APPROVED" }),
    ).rejects.toThrow(
      new QueryError(MSG.config.energyChainRequiresGantry, 400),
    );
  });

  test("the ENERGY_CHAIN gate is skipped on the backward reopen (TECH_APPROVED -> DRAFT)", async () => {
    mockConfigFindFirst.mockResolvedValue(makeConfig("TECH_APPROVED"));
    mockWashBaysFindMany.mockResolvedValue([PLAIN_BAY]);

    await expect(
      updateConfigStatus(CONF_ID, engineer, { status: "DRAFT" }),
    ).resolves.toEqual({ id: CONF_ID, fromStatus: "TECH_APPROVED" });
    expect(mockWashBaysFindMany).not.toHaveBeenCalled();
  });
});

describe("updateConfigStatus — concurrent transition guard", () => {
  test("throws a 409 conflict when the from-status guard matches zero rows", async () => {
    mockConfigFindFirst.mockResolvedValue(makeConfig("DRAFT"));
    // Another transaction committed a status change first: the from-status
    // guarded UPDATE now matches no rows.
    mockUpdate.mockReturnValue({
      set: () => ({
        where: () => ({ returning: () => [] }),
      }),
    });

    await expect(
      updateConfigStatus(CONF_ID, engineer, { status: "TECH_APPROVED" }),
    ).rejects.toThrow(new QueryError(MSG.config.statusConflict, 409));
  });
});

describe("updateConfigStatus — IN_TECH_REVIEW is out of bounds for STANDALONE", () => {
  test.each([
    ["DRAFT", "IN_TECH_REVIEW"],
    ["IN_TECH_REVIEW", "TECH_APPROVED"],
    ["TECH_APPROVED", "IN_TECH_REVIEW"],
  ] as [
    ConfigurationStatusType,
    ConfigurationStatusType,
  ][])("rejects %s -> %s on a standalone config", async (from, to) => {
    mockConfigFindFirst.mockResolvedValue(makeConfig(from));

    await expect(
      updateConfigStatus(CONF_ID, engineer, { status: to }),
    ).rejects.toThrow(new QueryError(MSG.config.statusUnauthorized, 403));
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
