import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export type PartNumber = typeof partNumbers.$inferSelect;
export type NewPartNumber = typeof partNumbers.$inferInsert;

export const pnTypeEnum = pgEnum("pn_type", ["PART", "ASSY"]);

export const partNumbers = pgTable("part_numbers", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  pn: varchar({ length: 25 }).unique().notNull(),
  description: varchar({ length: 255 }).notNull(),
  cost: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
  pn_type: pnTypeEnum("pn_type").notNull(),
  is_phantom: boolean().notNull(),
  // Subcontract-treated part (e.g. zinc-plating): BOM explosion stops here,
  // its cost already includes the external treatment phase
  is_subcontract: boolean().notNull().default(false),
  // Soft-delete flag: set false by the ERP sync when the pn disappears from the
  // extract. Rows are retained so frozen engineering BOMs, coefficients and
  // existing bom_lines keep resolving; only the UI part picker filters on it.
  is_active: boolean().notNull().default(true),
  family: varchar({ length: 255 }),
  sub_family: varchar({ length: 255 }),
  created_at: timestamp("created_at", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();
