import { integer, numeric, pgTable, timestamp, varchar, boolean, pgEnum } from "drizzle-orm/pg-core";

export type PartNumber = typeof partNumbers.$inferSelect;
export type NewPartNumber = typeof partNumbers.$inferInsert;

export const pnTypeEnum = pgEnum("pn_type", ["PART", "ASSY"]);



export const partNumbers = pgTable("part_numbers", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  pn: varchar({ length: 25 }).unique().notNull(),
  description: varchar({ length: 255 }).notNull(),
  cost: numeric().default("0").notNull(),
  pn_type: pnTypeEnum("pn_type").notNull(),
  is_phantom: boolean().notNull(),
  created_at: timestamp("created_at", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();
