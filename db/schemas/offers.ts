import {
  type AnyPgColumn,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { offerRevisions } from "@/db/schemas/offer-revisions";
import { userProfiles } from "@/db/schemas/user-profiles";

export type Offer = typeof offers.$inferSelect;
export type NewOffer = typeof offers.$inferInsert;

/**
 * Offer header — the stable spine of a commercial deal. It owns a series of revisions; the
 * lifecycle, pricing and commercial terms all live on those revisions, never here. Customer
 * info is kept as pragmatic v1 plain fields (no separate customers table).
 */
export const offers = pgTable("offers", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  offer_number: varchar("offer_number", { length: 50 }).notNull().unique(),
  customer_name: varchar("customer_name", { length: 255 }).notNull(),
  customer_address: varchar("customer_address", { length: 500 }),
  customer_email: varchar("customer_email", { length: 255 }),
  // Owner = the agent who created the offer. Scope flows from this (offerScopeWhere).
  // restrict: deleting a user must never destroy their offers (revisions and frozen
  // pricing/as-sold snapshots hang off them).
  user_id: uuid("user_id")
    .references(() => userProfiles.id, { onDelete: "restrict" })
    .notNull(),
  // The revision the customer accepted, if any. Circular FK to offer_revisions (each revision
  // points back to its offer); declared lazily via AnyPgColumn, as in user-profiles.manager_id.
  accepted_revision_id: integer("accepted_revision_id").references(
    (): AnyPgColumn => offerRevisions.id,
    { onDelete: "set null" },
  ),
  created_at: timestamp("created_at", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();
