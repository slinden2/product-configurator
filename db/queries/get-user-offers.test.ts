// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Role } from "@/types";

// --- Mocks ---
// We exercise the REAL getUserOffers shaping; only the db connection is faked.
const mockFindMany = vi.fn();
const mockSelect = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    query: {
      offers: {
        findMany: (...args: unknown[]) => mockFindMany(...args),
      },
    },
  },
}));

import { getUserOffers } from "@/db/queries";

/** Minimal UserData stand-in — getUserOffers only reads `id` and `role`. */
const makeUser = (role: Role, id = "user-1") =>
  ({ id, role, initials: null, manager_id: null }) as unknown as Parameters<
    typeof getUserOffers
  >[0];

const OWNER = { id: "user-1", email: "a@iteco.it", initials: "AA" };

const makeOffer = (
  id: number,
  revisions: { id: number; status: string; lineCount: number }[],
) => ({
  id,
  offer_number: `OF-${id}`,
  customer_name: `Customer ${id}`,
  created_at: new Date("2026-01-01"),
  updated_at: new Date("2026-01-02"),
  owner: OWNER,
  revisions,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockFindMany.mockResolvedValue([]);
  // Count query stub: db.select().from().where()
  mockSelect.mockReturnValue({
    from: () => ({ where: () => Promise.resolve([{ count: "0" }]) }),
  });
});

describe("getUserOffers", () => {
  test("shapes each offer with the working revision status and SQL-computed line count", async () => {
    mockFindMany.mockResolvedValue([
      makeOffer(1, [{ id: 7, status: "DRAFT", lineCount: 3 }]),
    ]);
    mockSelect.mockReturnValue({
      from: () => ({ where: () => Promise.resolve([{ count: "1" }]) }),
    });

    const { data, totalCount } = await getUserOffers(makeUser("ADMIN"));

    expect(data).toEqual([
      {
        id: 1,
        offer_number: "OF-1",
        customer_name: "Customer 1",
        created_at: new Date("2026-01-01"),
        updated_at: new Date("2026-01-02"),
        owner: OWNER,
        status: "DRAFT",
        lineCount: 3,
      },
    ]);
    expect(totalCount).toBe(1);
  });

  test("defaults to null status and zero lines for an offer with no revisions", async () => {
    mockFindMany.mockResolvedValue([makeOffer(2, [])]);

    const { data } = await getUserOffers(makeUser("ADMIN"));

    expect(data[0].status).toBeNull();
    expect(data[0].lineCount).toBe(0);
  });

  test("counts lines via a revision-level extras subquery instead of loading line rows", async () => {
    await getUserOffers(makeUser("ADMIN"));

    const query = mockFindMany.mock.calls[0][0];
    const revisions = query.with.revisions;
    expect(revisions.extras).toBeTypeOf("function");
    // The old shape fetched `with: { lines: ... }` just to count them.
    expect(revisions.with).toBeUndefined();
  });

  test("coerces the driver's string count and applies pagination", async () => {
    mockSelect.mockReturnValue({
      from: () => ({ where: () => Promise.resolve([{ count: "42" }]) }),
    });

    const { totalCount } = await getUserOffers(makeUser("ADMIN"), 3, 20);

    expect(totalCount).toBe(42);
    const query = mockFindMany.mock.calls[0][0];
    expect(query.limit).toBe(20);
    expect(query.offset).toBe(40);
  });
});
