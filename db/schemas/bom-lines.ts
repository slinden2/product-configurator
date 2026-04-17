import {
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
    parent_pn: varchar("parent_pn", { length: 25 }).notNull(),
    child_pn: varchar("child_pn", { length: 25 }).notNull(),
    qty: numeric("qty", { precision: 10, scale: 3 }).notNull(),
    pos: integer("pos").notNull(),
    created_at: timestamp("created_at", { mode: "date", precision: 3 })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { mode: "date", precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("bom_lines_parent_pos_unq").on(t.parent_pn, t.pos)],
).enableRLS();
