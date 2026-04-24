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
