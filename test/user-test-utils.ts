import type { UserData } from "@/db/queries";
import type { Role } from "@/types";

/**
 * Minimal `UserData` for component/server-component tests. Kept in one place so
 * a change to the users query shape is a single edit, not a hunt through
 * per-file factories.
 */
export const makeTestUser = (
  role: Role,
  overrides: Partial<NonNullable<UserData>> = {},
): NonNullable<UserData> =>
  ({
    id: "u1",
    email: "test@itecosrl.com",
    role,
    initials: null,
    manager_id: null,
    ...overrides,
  }) as NonNullable<UserData>;
