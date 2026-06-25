import {
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
    created_at: timestamp("created_at", { mode: "date", precision: 3 })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { mode: "date", precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [unique().on(table.offer_revision_id, table.position)],
).enableRLS();
