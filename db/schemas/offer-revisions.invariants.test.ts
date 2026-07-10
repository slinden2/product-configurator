// @vitest-environment node
import { getTableColumns } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, test } from "vitest";
import { offerRevisionLines, offerRevisions } from "@/db/schemas";

/**
 * Structural invariants from `.claude/rules/workflow.md`, asserted on the
 * Drizzle table definitions (pure imports, no DB connection).
 */

describe("renegotiation-ness is derived, never stored (workflow.md 'Renegotiation')", () => {
  test.each([
    ["offer_revisions", offerRevisions],
    ["offer_revision_lines", offerRevisionLines],
  ] as const)("%s carries no stored renegotiation flag column", (_name, table) => {
    // The derivation lives in lib/offer-renegotiation.ts, anchored on the
    // as-sold freeze. A stored flag would let the two drift.
    for (const column of Object.values(getTableColumns(table))) {
      expect(column.name).not.toMatch(/renegoti/i);
    }
  });
});

describe("one line per config per revision (workflow.md 'Renegotiation')", () => {
  test("offer_revision_lines is unique on (offer_revision_id, configuration_id)", () => {
    // "One line per config per revision — post-acceptance a config can own its
    // frozen accepted line plus one line per renegotiation revision."
    const { uniqueConstraints } = getTableConfig(offerRevisionLines);
    const columnSets = uniqueConstraints.map((constraint) =>
      constraint.columns.map((column) => column.name).toSorted(),
    );
    expect(columnSets).toContainEqual(
      ["offer_revision_id", "configuration_id"].toSorted(),
    );
  });
});
