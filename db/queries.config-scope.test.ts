// @vitest-environment node
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ConfigOrigin, ConfigurationStatusType, Role } from "@/types";

// --- Mocks ---
// We exercise the REAL configScopeWhere / canAccessConfiguration / getUserConfigurations,
// so only the db connection is faked.
const mockSelect = vi.fn();
const mockFindFirst = vi.fn();
const mockFindMany = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    query: {
      configurations: {
        findMany: (...args: unknown[]) => mockFindMany(...args),
      },
      userProfiles: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
    },
  },
}));

import {
  canAccessConfiguration,
  configScopeWhere,
  getUserConfigurations,
} from "@/db/queries";

const dialect = new PgDialect();
const renderSql = (clause: unknown): string =>
  dialect.sqlToQuery(clause as SQL).sql;
const renderParams = (clause: unknown): unknown[] =>
  dialect.sqlToQuery(clause as SQL).params;

/** Minimal UserData stand-in — the helpers only read `id` and `role`. */
const makeUser = (role: Role, id = "user-1") =>
  ({ id, role, initials: null, manager_id: null }) as unknown as Parameters<
    typeof canAccessConfiguration
  >[0];

const makeConfig = (
  origin: ConfigOrigin,
  status: ConfigurationStatusType,
  user_id = "user-2",
) => ({ user_id, origin, status });

beforeEach(() => {
  vi.clearAllMocks();
  // Chainable stub for the manager subquery: db.select().from().where()
  mockSelect.mockReturnValue({
    from: () => ({ where: () => ({ __subquery: true }) }),
  });
});

describe("configScopeWhere", () => {
  test("ADMIN/ENGINEER/SALES_DIRECTOR see all configs (undefined filter)", () => {
    expect(configScopeWhere(makeUser("ADMIN"))).toBeUndefined();
    expect(configScopeWhere(makeUser("ENGINEER"))).toBeUndefined();
    expect(configScopeWhere(makeUser("SALES_DIRECTOR"))).toBeUndefined();
    expect(mockSelect).not.toHaveBeenCalled();
  });

  test("SALES is scoped to its own configs", () => {
    const sql = renderSql(configScopeWhere(makeUser("SALES")));
    expect(sql).toContain('"configurations"."user_id"');
    expect(sql).not.toBe("false");
    expect(mockSelect).not.toHaveBeenCalled();
  });

  test("SALES_MANAGER scopes via the own + direct-reports subquery", () => {
    expect(configScopeWhere(makeUser("SALES_MANAGER"))).toBeDefined();
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });

  test("an unrecognized role fails closed to match no rows", () => {
    expect(renderSql(configScopeWhere(makeUser("FOO" as Role)))).toBe("false");
  });
});

describe("canAccessConfiguration — ENGINEER offer hand-off gate", () => {
  test("ENGINEER is denied pre-handoff OFFER configs (DRAFT)", async () => {
    await expect(
      canAccessConfiguration(
        makeUser("ENGINEER"),
        makeConfig("OFFER", "DRAFT"),
      ),
    ).resolves.toBe(false);
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  test("ENGINEER can access handed-off OFFER configs (SALES_APPROVED+)", async () => {
    for (const status of [
      "SALES_APPROVED",
      "IN_TECH_REVIEW",
      "TECH_APPROVED",
      "CLOSED",
    ] as const) {
      await expect(
        canAccessConfiguration(
          makeUser("ENGINEER"),
          makeConfig("OFFER", status),
        ),
      ).resolves.toBe(true);
    }
  });

  test("ENGINEER can access STANDALONE configs at any status", async () => {
    await expect(
      canAccessConfiguration(
        makeUser("ENGINEER"),
        makeConfig("STANDALONE", "DRAFT"),
      ),
    ).resolves.toBe(true);
  });

  test("ADMIN and SALES_DIRECTOR still access pre-handoff OFFER configs", async () => {
    await expect(
      canAccessConfiguration(makeUser("ADMIN"), makeConfig("OFFER", "DRAFT")),
    ).resolves.toBe(true);
    await expect(
      canAccessConfiguration(
        makeUser("SALES_DIRECTOR"),
        makeConfig("OFFER", "DRAFT"),
      ),
    ).resolves.toBe(true);
  });

  test("the owning SALES agent still accesses its own pre-handoff OFFER config", async () => {
    await expect(
      canAccessConfiguration(
        makeUser("SALES", "owner"),
        makeConfig("OFFER", "DRAFT", "owner"),
      ),
    ).resolves.toBe(true);
  });

  test("a SALES agent cannot access another agent's config", async () => {
    await expect(
      canAccessConfiguration(makeUser("SALES"), makeConfig("OFFER", "DRAFT")),
    ).resolves.toBe(false);
  });

  test("SALES_MANAGER scope additionally requires the report to be SALES", async () => {
    mockFindFirst.mockResolvedValue({ id: "report" });
    await canAccessConfiguration(
      makeUser("SALES_MANAGER", "mgr"),
      makeConfig("STANDALONE", "DRAFT", "report"),
    );

    // Defense-in-depth: the report-lookup must filter on role = SALES so a stale
    // manager_id on a non-SALES profile can never pass the single-record gate.
    const where = mockFindFirst.mock.calls[0][0].where;
    const sql = renderSql(where);
    const params = renderParams(where);
    expect(sql).toContain('"user_profiles"."role"');
    expect(params).toContain("SALES");
  });
});

describe("getUserConfigurations — technical queue filter", () => {
  beforeEach(() => {
    mockFindMany.mockResolvedValue([]);
    // Count select chain ends in countResult[0].count
    mockSelect.mockReturnValue({
      from: () => ({ where: () => [{ count: 0 }] }),
    });
  });

  test("ORs STANDALONE (all statuses) with OFFER handed-off (SALES_APPROVED+)", async () => {
    await getUserConfigurations(makeUser("ENGINEER"));

    const where = mockFindMany.mock.calls[0][0].where;
    const sql = renderSql(where);
    const params = renderParams(where);
    expect(sql).toContain('"configurations"."origin"');
    expect(sql).toContain('"configurations"."configuration_status"');
    // STANDALONE branch + the handed-off status set on the OFFER branch
    // (values are bound parameters, so assert against the params array).
    expect(params).toEqual(
      expect.arrayContaining([
        "STANDALONE",
        "OFFER",
        "SALES_APPROVED",
        "IN_TECH_REVIEW",
        "TECH_APPROVED",
        "CLOSED",
      ]),
    );
    // The pre-handoff status must NOT be part of the filter.
    expect(params).not.toContain("DRAFT");
  });

  test("composes the technical-queue filter with the per-role scope (SALES_MANAGER)", async () => {
    await getUserConfigurations(makeUser("SALES_MANAGER"));
    const sql = renderSql(mockFindMany.mock.calls[0][0].where);
    // Both the scope subquery and the origin/status filter are AND-ed together.
    expect(sql).toContain('"configurations"."user_id"');
    expect(sql).toContain('"configurations"."origin"');
  });
});
