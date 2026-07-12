// @vitest-environment node
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Role } from "@/types";

// --- Mocks ---
// We exercise the REAL offerScopeWhere / canAccessOffer, so only the db connection is faked.
const mockSelect = vi.fn();
const mockFindFirst = vi.fn();

vi.mock("@/db", () => ({
  db: {
    // Used only by the SALES_MANAGER subquery branch of offerScopeWhere.
    select: (...args: unknown[]) => mockSelect(...args),
    query: {
      userProfiles: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
    },
  },
}));

import { canAccessOffer, offerScopeWhere } from "@/db/queries";

const dialect = new PgDialect();
const renderSql = (clause: unknown): string =>
  dialect.sqlToQuery(clause as SQL).sql;
const renderParams = (clause: unknown): unknown[] =>
  dialect.sqlToQuery(clause as SQL).params;

/** Minimal UserData stand-in — the helpers only read `id` and `role`. */
const makeUser = (role: Role, id = "user-1") =>
  ({ id, role, initials: null, manager_id: null }) as unknown as Parameters<
    typeof canAccessOffer
  >[0];

beforeEach(() => {
  vi.clearAllMocks();
  // Chainable stub for the manager subquery: db.select().from().where()
  mockSelect.mockReturnValue({
    from: () => ({ where: () => ({ __subquery: true }) }),
  });
});

describe("offerScopeWhere", () => {
  test("ADMIN and SALES_DIRECTOR see all offers (undefined filter)", () => {
    expect(offerScopeWhere(makeUser("ADMIN"))).toBeUndefined();
    expect(offerScopeWhere(makeUser("SALES_DIRECTOR"))).toBeUndefined();
    expect(mockSelect).not.toHaveBeenCalled();
  });

  test("ENGINEER has no offer access — fails closed to match no rows", () => {
    const clause = offerScopeWhere(makeUser("ENGINEER"));
    // Crucially NOT undefined (which would mean see-everything).
    expect(clause).toBeDefined();
    expect(renderSql(clause)).toBe("false");
    expect(mockSelect).not.toHaveBeenCalled();
  });

  test("an unrecognized role fails closed to match no rows", () => {
    const clause = offerScopeWhere(makeUser("FOO" as Role));
    expect(renderSql(clause)).toBe("false");
    expect(mockSelect).not.toHaveBeenCalled();
  });

  test("SALES is scoped to its own offers", () => {
    const clause = offerScopeWhere(makeUser("SALES"));
    const sql = renderSql(clause);
    expect(sql).toContain('"offers"."user_id"');
    expect(sql).not.toBe("false");
    // Own-only path does not issue the reports subquery.
    expect(mockSelect).not.toHaveBeenCalled();
  });

  test("SALES_MANAGER scopes via the own + direct-reports subquery", () => {
    const clause = offerScopeWhere(makeUser("SALES_MANAGER"));
    expect(clause).toBeDefined();
    // The manager branch builds an inArray subquery over user_profiles.
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });
});

describe("canAccessOffer", () => {
  const ownOffer = { user_id: "user-1" };
  const otherOffer = { user_id: "user-2" };

  test("ADMIN and SALES_DIRECTOR can access any offer without a DB lookup", async () => {
    await expect(canAccessOffer(makeUser("ADMIN"), otherOffer)).resolves.toBe(
      true,
    );
    await expect(
      canAccessOffer(makeUser("SALES_DIRECTOR"), otherOffer),
    ).resolves.toBe(true);
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  test("ENGINEER is denied all offer access", async () => {
    await expect(canAccessOffer(makeUser("ENGINEER"), ownOffer)).resolves.toBe(
      false,
    );
    await expect(
      canAccessOffer(makeUser("ENGINEER"), otherOffer),
    ).resolves.toBe(false);
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  test("SALES can access its own offer but not another's", async () => {
    await expect(canAccessOffer(makeUser("SALES"), ownOffer)).resolves.toBe(
      true,
    );
    await expect(canAccessOffer(makeUser("SALES"), otherOffer)).resolves.toBe(
      false,
    );
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  test("SALES_MANAGER can access a direct report's offer", async () => {
    mockFindFirst.mockResolvedValue({ id: "user-2" });
    await expect(
      canAccessOffer(makeUser("SALES_MANAGER"), otherOffer),
    ).resolves.toBe(true);
    expect(mockFindFirst).toHaveBeenCalledTimes(1);
  });

  test("SALES_MANAGER cannot access a non-report's offer", async () => {
    mockFindFirst.mockResolvedValue(undefined);
    await expect(
      canAccessOffer(makeUser("SALES_MANAGER"), otherOffer),
    ).resolves.toBe(false);
  });

  test("SALES_MANAGER scope additionally requires the report to be SALES", async () => {
    mockFindFirst.mockResolvedValue(undefined);
    await canAccessOffer(makeUser("SALES_MANAGER", "mgr"), otherOffer);
    expect(mockFindFirst).toHaveBeenCalledTimes(1);
    // Defense-in-depth: the report-lookup must filter on role = SALES so a stale
    // manager_id on a non-SALES profile can never leak an offer (with pricing).
    const where = mockFindFirst.mock.calls[0][0].where;
    const sql = renderSql(where);
    const params = renderParams(where);
    expect(sql).toContain('"user_profiles"."role"');
    expect(params).toContain("SALES");
  });

  test("SALES_MANAGER accesses its own offer without a report lookup", async () => {
    await expect(
      canAccessOffer(makeUser("SALES_MANAGER"), ownOffer),
    ).resolves.toBe(true);
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  test("an unrecognized role is denied", async () => {
    await expect(
      canAccessOffer(makeUser("FOO" as Role), ownOffer),
    ).resolves.toBe(false);
  });
});
