/**
 * Shared mock of `canAccessConfiguration` for server-action tests. Mirrors the
 * real scope rule in `db/queries/configurations.ts`: ADMIN/ENGINEER/SALES_DIRECTOR see every
 * configuration, everyone else (SALES, SALES_MANAGER) only their own. The
 * SALES_MANAGER-with-reports branch isn't modeled here because action tests
 * exercise owner/non-owner configs, not the reporting hierarchy.
 *
 * Exported with a `mock` prefix so it is safe to reference inside hoisted
 * `vi.mock` factories.
 */
export const mockCanAccessConfiguration = async (
  user: { id: string; role: string },
  config: { user_id: string },
): Promise<boolean> => {
  if (
    user.role === "ADMIN" ||
    user.role === "ENGINEER" ||
    user.role === "SALES_DIRECTOR"
  ) {
    return true;
  }
  return config.user_id === user.id;
};
