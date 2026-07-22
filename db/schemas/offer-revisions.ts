import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { offers } from "@/db/schemas/offers";
import { userProfiles } from "@/db/schemas/user-profiles";
import { OfferStatus, TransportModes } from "@/types";

export const offerStatusEnum = pgEnum("offer_status", OfferStatus);

// Transport and installation share the same TBD/INCLUDED/SEPARATE value set.
export const transportModeEnum = pgEnum("transport_mode", TransportModes);
export const installationModeEnum = pgEnum("installation_mode", TransportModes);

export type OfferRevision = typeof offerRevisions.$inferSelect;
export type NewOfferRevision = typeof offerRevisions.$inferInsert;

/**
 * Offer revision — carries the per-revision lifecycle (`status`) and the deal's commercial
 * header: one deal-level discount %, transport, installation, validity and notes. Each revision
 * is approved and sent independently; per-line pricing derives from these fields and lives on
 * offer_revision_lines.
 */
export const offerRevisions = pgTable(
  "offer_revisions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    offer_id: integer("offer_id")
      .references(() => offers.id, { onDelete: "cascade" })
      .notNull(),
    revision_no: integer("revision_no").notNull(),
    status: offerStatusEnum("status").notNull().default("DRAFT"),
    discount_pct: numeric("discount_pct", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
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
    // Free rounding discount ("Sconto extra"): absolute euro amount subtracted
    // from the offer net total. Offer-level like transport/installation — never
    // touches per-line net_price or the pricing snapshots.
    extra_discount_amount: numeric("extra_discount_amount", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0.00"),
    show_net_total_only: boolean("show_net_total_only")
      .notNull()
      .default(false),
    valid_until: timestamp("valid_until", { mode: "date", precision: 3 }),
    notes: text("notes"),
    // Supply conditions ("Condizioni di fornitura", #274): per-revision commercial
    // terms rendered as a list on the quote. Empty delivery/payment fields render
    // "Da definire"; an empty destination falls back to the offer's customer_address.
    // warranty_months is constrained to WarrantyMonthsOptions (12/24) by
    // offerSettingsSchema; the column stays a plain integer.
    delivery_date: timestamp("delivery_date", { mode: "date", precision: 3 }),
    delivery_destination: varchar("delivery_destination", { length: 500 }),
    payment_terms: varchar("payment_terms", { length: 500 }),
    warranty_months: integer("warranty_months").notNull().default(12),
    // Manager who approved this revision for send, and when.
    approved_by: uuid("approved_by").references(() => userProfiles.id, {
      onDelete: "set null",
    }),
    approved_at: timestamp("approved_at", { mode: "date", precision: 3 }),
    sent_at: timestamp("sent_at", { mode: "date", precision: 3 }),
    created_at: timestamp("created_at", { mode: "date", precision: 3 })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { mode: "date", precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [unique().on(table.offer_id, table.revision_no)],
).enableRLS();
