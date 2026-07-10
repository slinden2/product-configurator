// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { UpdateConfigSchema } from "@/validation/config-schema";

// --- Mocks ---
// We exercise the REAL status-guarded write helpers (issue #240), so only the
// db connection is faked.
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockSelect = vi.fn();

vi.mock("@/db", () => ({
  db: {
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    select: (...args: unknown[]) => mockSelect(...args),
    query: {
      configurations: { findFirst: vi.fn() },
      washBays: { findMany: vi.fn() },
      engineeringBomItems: { findFirst: vi.fn() },
      userProfiles: { findFirst: vi.fn() },
    },
  },
}));

import {
  assertConfigurationStatus,
  deleteConfiguration,
  QueryError,
  touchConfigurationUpdatedAt,
  updateConfiguration,
} from "@/db/queries";
import type { TransactionType } from "@/db/queries/errors";
import { MSG } from "@/lib/messages";

const CONF_ID = 1;

// transformConfigToDbUpdate is a plain field mapping, so a minimal payload
// is enough at runtime.
const UPDATE_DATA = { name: "Test" } as unknown as UpdateConfigSchema;

const updateChain = (returned: unknown[]) => ({
  set: () => ({
    where: () => ({ returning: () => returned }),
  }),
});

const deleteChain = (returned: unknown[]) => ({
  where: () => ({ returning: () => returned }),
});

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdate.mockReturnValue(updateChain([{ id: CONF_ID }]));
  mockDelete.mockReturnValue(deleteChain([{ id: CONF_ID }]));
});

describe("updateConfiguration — status compare-and-swap", () => {
  test("resolves with the id when the status-guarded update matches", async () => {
    await expect(
      updateConfiguration(CONF_ID, UPDATE_DATA, "DRAFT"),
    ).resolves.toEqual({ id: CONF_ID });
  });

  test("throws a 409 conflict when the status guard matches zero rows", async () => {
    mockUpdate.mockReturnValue(updateChain([]));

    await expect(
      updateConfiguration(CONF_ID, UPDATE_DATA, "DRAFT"),
    ).rejects.toThrow(new QueryError(MSG.config.statusConflict, 409));
  });
});

describe("deleteConfiguration — status compare-and-swap", () => {
  test("resolves when the status-guarded delete matches", async () => {
    await expect(
      deleteConfiguration(CONF_ID, "DRAFT"),
    ).resolves.toBeUndefined();
  });

  test("throws a 409 conflict when the status guard matches zero rows", async () => {
    mockDelete.mockReturnValue(deleteChain([]));

    await expect(deleteConfiguration(CONF_ID, "DRAFT")).rejects.toThrow(
      new QueryError(MSG.config.statusConflict, 409),
    );
  });
});

describe("touchConfigurationUpdatedAt — status compare-and-swap", () => {
  test("resolves when the status-guarded touch matches", async () => {
    await expect(
      touchConfigurationUpdatedAt(CONF_ID, "DRAFT"),
    ).resolves.toBeUndefined();
  });

  test("throws a 409 conflict when the status guard matches zero rows", async () => {
    mockUpdate.mockReturnValue(updateChain([]));

    await expect(touchConfigurationUpdatedAt(CONF_ID, "DRAFT")).rejects.toThrow(
      new QueryError(MSG.config.statusConflict, 409),
    );
  });
});

describe("assertConfigurationStatus — in-tx locked status re-check", () => {
  const makeTx = (rows: unknown[]) => {
    const forUpdate = vi.fn().mockResolvedValue(rows);
    const tx = {
      select: () => ({
        from: () => ({
          where: () => ({ for: forUpdate }),
        }),
      }),
    } as unknown as TransactionType;
    return { tx, forUpdate };
  };

  test("resolves and locks the row FOR UPDATE when the status still matches", async () => {
    const { tx, forUpdate } = makeTx([{ id: CONF_ID }]);

    await expect(
      assertConfigurationStatus(CONF_ID, "IN_TECH_REVIEW", tx),
    ).resolves.toBeUndefined();
    expect(forUpdate).toHaveBeenCalledWith("update");
  });

  test("throws a 409 conflict when the status moved (zero matching rows)", async () => {
    const { tx } = makeTx([]);

    await expect(
      assertConfigurationStatus(CONF_ID, "IN_TECH_REVIEW", tx),
    ).rejects.toThrow(new QueryError(MSG.config.statusConflict, 409));
  });
});
