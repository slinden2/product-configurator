import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { userProfiles } from "@/db/schemas/user-profiles";
import { CoefficientSources } from "@/types";

export type PriceCoefficient = typeof priceCoefficients.$inferSelect;
export type NewPriceCoefficient = typeof priceCoefficients.$inferInsert;

export const coefficientSourceEnum = pgEnum(
  "coefficient_source",
  CoefficientSources,
);

export const priceCoefficients = pgTable("price_coefficients", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  // pn is an ERP catalog code, intentionally NOT FK-constrained to part_numbers.pn.
  // Coefficients are not part of the ERP sync: MAXBOM rows are seeded from the static
  // MaxBOM rule catalog (collectMaxBomPns, lib/pricing.ts) independent of part_numbers,
  // and manual rows may be created before a pn is imported — so a coefficient can
  // reference a pn absent from part_numbers. A real FK would break
  // insertMissingMaxBomCoefficients / manual creation; getAllPriceCoefficients
  // (db/queries/coefficients.ts) LEFT JOINs part_numbers to tolerate this.
  pn: varchar({ length: 25 }).unique().notNull(),
  coefficient: numeric({ precision: 5, scale: 2 }).notNull().default("3.00"),
  source: coefficientSourceEnum("source").notNull(),
  is_custom: boolean("is_custom").notNull().default(false),
  updated_by: uuid("updated_by").references(() => userProfiles.id, {
    onDelete: "set null",
  }),
  created_at: timestamp("created_at", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();
