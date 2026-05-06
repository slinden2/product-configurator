import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { userProfiles } from "@/db/schemas/user-profiles";
import { SurchargeKinds } from "@/types";

export type SurchargeSetting = typeof surchargeSettings.$inferSelect;
export type NewSurchargeSetting = typeof surchargeSettings.$inferInsert;

export const surchargeKindEnum = pgEnum("surcharge_kind", SurchargeKinds);

export const surchargeSettings = pgTable("surcharge_settings", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  kind: surchargeKindEnum("kind").unique().notNull(),
  price: numeric({ precision: 10, scale: 2 }).notNull().default("0.00"),
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
