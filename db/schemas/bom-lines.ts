import {
  index,
  integer,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export type BomLine = typeof bomLines.$inferSelect;
export type NewBomLine = typeof bomLines.$inferInsert;

export const bomLines = pgTable(
  "bom_lines",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    // parent_pn / child_pn are ERP catalog codes, intentionally NOT FK-constrained
    // to part_numbers.pn. bom_lines and part_numbers are populated from two
    // independent ERP queries with different filters: fetch-part-numbers-query.sql
    // INNER JOINs description/production-data and filters on empty language/option,
    // while fetch-bom-structure-query.sql has no such constraint — so a parent/child
    // pn can legitimately reference a pn the part-numbers extract excludes (import
    // ordering does not prevent this). A real FK would fail the batchUpsertBomStructure
    // transaction (lib/db-sync/sync-logic.ts) on any such orphan; downstream reads
    // instead skip dangling children (getAssemblyChildren, db/queries/ebom.ts).
    parent_pn: varchar("parent_pn", { length: 25 }).notNull(),
    child_pn: varchar("child_pn", { length: 25 }).notNull(),
    qty: numeric("qty", { precision: 10, scale: 3 }).notNull(),
    sort_order: integer("sort_order").notNull(),
    created_at: timestamp("created_at", { mode: "date", precision: 3 })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { mode: "date", precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("bom_lines_parent_pos_unq").on(t.parent_pn, t.sort_order),
    // parent_pn is covered by the unique prefix above; child_pn (where-used
    // lookups during BOM explosion) needs its own index.
    index("bom_lines_child_pn_idx").on(t.child_pn),
  ],
).enableRLS();
