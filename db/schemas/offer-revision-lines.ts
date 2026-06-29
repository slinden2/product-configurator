import { sql } from "drizzle-orm";
import {
  check,
  integer,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { configurations } from "@/db/schemas/configurations";
import { offerRevisions } from "@/db/schemas/offer-revisions";

export type OfferRevisionLine = typeof offerRevisionLines.$inferSelect;
export type NewOfferRevisionLine = typeof offerRevisionLines.$inferInsert;

/**
 * Offer revision line — one configuration's commercial position within a revision. Commercial
 * pricing lives here, never on `configurations`. `net_price` is derived by allocating the
 * revision's header discount; `line_discount_percent` is a nullable future hook for per-line
 * overrides. `pricing_snapshot` captures the as-sent quote figures when the revision is sent.
 *
 * Each revision deep-clones its configurations, so a configuration belongs to exactly one line
 * (enforced by the unique on configuration_id).
 *
 * `as_sold_snapshot` / `as_sold_frozen_at` capture the configuration exactly as sold at the
 * moment the customer accepts this revision (the technical counterpart to the commercial
 * `pricing_snapshot`). Both sit on the same frozen line so commercial and technical can never
 * drift. They are written together at acceptance and never cleared (the offer locks).
 */
export const offerRevisionLines = pgTable(
  "offer_revision_lines",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    offer_revision_id: integer("offer_revision_id")
      .references(() => offerRevisions.id, { onDelete: "cascade" })
      .notNull(),
    configuration_id: integer("configuration_id")
      .references(() => configurations.id, { onDelete: "cascade" })
      .unique()
      .notNull(),
    position: integer("position").notNull(),
    quantity: integer("quantity").notNull().default(1),
    list_price: numeric("list_price", { precision: 12, scale: 2 }).notNull(),
    net_price: numeric("net_price", { precision: 12, scale: 2 }).notNull(),
    line_discount_percent: numeric("line_discount_percent", {
      precision: 5,
      scale: 2,
    }),
    pricing_snapshot: jsonb("pricing_snapshot"),
    // As-sold capture, set at the at-acceptance freeze. as_sold_frozen_at !== null is the
    // freeze marker; as_sold_snapshot holds the full form-shaped configuration (config +
    // water tanks + wash bays) as sold.
    as_sold_frozen_at: timestamp("as_sold_frozen_at", {
      mode: "date",
      precision: 3,
    }),
    as_sold_snapshot: jsonb("as_sold_snapshot"),
    created_at: timestamp("created_at", { mode: "date", precision: 3 })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { mode: "date", precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique().on(table.offer_revision_id, table.position),
    // The as-sold freeze marker and capture are set together at acceptance, never one
    // without the other (mirrors the consistency invariant the old offer_snapshots had).
    check(
      "offer_revision_lines_as_sold_consistency",
      sql`(${table.as_sold_frozen_at} IS NULL) = (${table.as_sold_snapshot} IS NULL)`,
    ),
  ],
).enableRLS();
