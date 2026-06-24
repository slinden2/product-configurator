import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { configurations } from "@/db/schemas/configurations";
import { userProfiles } from "@/db/schemas/user-profiles";
import { OfferSources, TransportModes } from "@/types";

export const offerSourceEnum = pgEnum("offer_source", OfferSources);
export const transportModeEnum = pgEnum("transport_mode", TransportModes);
export const installationModeEnum = pgEnum("installation_mode", TransportModes);

export type OfferSnapshot = typeof offerSnapshots.$inferSelect;
export type NewOfferSnapshot = typeof offerSnapshots.$inferInsert;

export const offerSnapshots = pgTable(
  "offer_snapshots",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    configuration_id: integer("configuration_id")
      .references(() => configurations.id, { onDelete: "cascade" })
      .unique()
      .notNull(),
    source: offerSourceEnum("source").notNull(),
    generated_at: timestamp("generated_at", { mode: "date", precision: 3 })
      .notNull()
      .defaultNow(),
    generated_by: uuid("generated_by").references(() => userProfiles.id, {
      onDelete: "set null",
    }),
    discount_pct: numeric("discount_pct", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    items: jsonb("items").notNull(),
    total_list_price: numeric("total_list_price", {
      precision: 12,
      scale: 2,
    }).notNull(),
    bom_rules_version: varchar("bom_rules_version", { length: 20 }).notNull(),
    show_net_total_only: boolean("show_net_total_only")
      .notNull()
      .default(false),
    transport_amount: numeric("transport_amount", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    transport_mode: transportModeEnum("transport_mode")
      .notNull()
      .default("TBD"),
    installation_mode: installationModeEnum("installation_mode")
      .notNull()
      .default("TBD"),
    installation_items: jsonb("installation_items").notNull().default([]),
    // As-sold capture, set at the SALES_APPROVED freeze and cleared on thaw.
    // frozen_at !== null is the freeze marker; config_snapshot holds the full
    // form-shaped configuration (config + water tanks + wash bays) as sold.
    frozen_at: timestamp("frozen_at", { mode: "date", precision: 3 }),
    config_snapshot: jsonb("config_snapshot"),
    updated_at: timestamp("updated_at", { mode: "date", precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Enforce the freeze invariant at the source: frozen_at and config_snapshot
    // are set together (freeze) and cleared together (thaw), never one without the
    // other. Backstops freezeOfferSnapshot/thawOfferSnapshot against drift.
    check(
      "offer_snapshots_frozen_consistency",
      sql`(${table.frozen_at} IS NULL) = (${table.config_snapshot} IS NULL)`,
    ),
  ],
).enableRLS();
