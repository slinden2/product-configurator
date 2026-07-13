// @vitest-environment node
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, test } from "vitest";
import { userProfiles } from "@/db/schemas";

/**
 * Regression guard for the self-reactivation / self-promotion hole.
 *
 * `user_profiles` carries the administrative columns (`role`, `is_active`,
 * `deactivated_at`, `manager_id`). The Supabase URL and anon key ship to the
 * browser, so any permissive write policy on this table is reachable from a
 * user's own JWT via PostgREST — bypassing every Server Action guard. A policy
 * that once allowed `auth.uid() = id` let a deactivated user set `is_active`
 * back to true, and let any user promote themselves to ADMIN.
 *
 * Writes belong exclusively to the audited Server Actions, which reach the DB as
 * `postgres` (table owner, bypasses RLS) and are therefore unaffected by having
 * no write policy at all.
 */
describe("user_profiles RLS policies", () => {
  const { policies, enableRLS } = getTableConfig(userProfiles);
  const policyFor = (cmd: string) =>
    policies.filter((p) => (p.for ?? "all").toLowerCase() === cmd);

  test("RLS is enabled", () => {
    expect(enableRLS).toBe(true);
  });

  test("exposes no write policy to the Supabase API roles", () => {
    // No UPDATE/DELETE/ALL policy may exist: with RLS on and no permissive
    // policy, PostgREST writes are denied outright.
    expect(policyFor("update")).toHaveLength(0);
    expect(policyFor("delete")).toHaveLength(0);
    expect(policyFor("all")).toHaveLength(0);
  });

  test("no policy grants a user write access to their own row", () => {
    // `auth.uid() = id` in a write policy is the exact shape of the bug.
    const writePolicies = policies.filter(
      (p) => (p.for ?? "all").toLowerCase() !== "select",
    );
    for (const policy of writePolicies) {
      const expr = JSON.stringify([policy.using, policy.withCheck]);
      expect(expr).not.toContain("auth.uid() = id");
    }
  });
});
