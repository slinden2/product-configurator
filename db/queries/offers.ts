import { and, asc, desc, eq, ilike, inArray, max, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  type ConfigurationWithWaterTanksAndWashBays,
  configurations,
  type NewOfferRevisionLine,
  offerRevisionLines,
  offerRevisions,
  offers,
  userProfiles,
  washBays,
  waterTanks,
} from "@/db/schemas";
import { canAccessAllOffers, canViewOffer } from "@/lib/access";
import { MSG } from "@/lib/messages";
import { firstAcceptedRevisionNo } from "@/lib/offer-renegotiation";
import type { ConfigOrigin, OfferStatusType, TransportMode } from "@/types";
import { OPEN_REVISION_STATUSES } from "@/types";
import type { ConfigSchema } from "@/validation/config-schema";
import type { OfferHeaderInput } from "@/validation/offer/offer-schema";
import type { OfferConfigSnapshot } from "@/validation/offer-config-snapshot-schema";
import type {
  OfferInstallationItem,
  OfferLineItem,
} from "@/validation/offer-schema";
import { insertActivityLog } from "./activity";
import { cloneConfigurationRows, insertConfiguration } from "./configurations";
import { type DatabaseType, QueryError, type TransactionType } from "./errors";
import type { UserData } from "./users";

/**
 * Offer-side equivalent of {@link configScopeWhere}: scopes an offer list/count to what the
 * given user may see. Returns `undefined` for "see everything".
 * - ENGINEER (and any role without offer access): no offers at all — fails closed.
 * - SALES: own offers only.
 * - SALES_MANAGER: own + direct reports' offers.
 * - SALES_DIRECTOR/ADMIN: all offers.
 */
export function offerScopeWhere(user: NonNullable<UserData>) {
  // ENGINEER and unknown roles have no offer access: match no rows.
  if (!canViewOffer(user.role)) {
    return sql`false`;
  }

  // All-offer-access roles (ADMIN/SALES_DIRECTOR) see everything.
  if (canAccessAllOffers(user.role)) {
    return undefined;
  }

  if (user.role === "SALES") {
    return eq(offers.user_id, user.id);
  }

  if (user.role === "SALES_MANAGER") {
    return inArray(
      offers.user_id,
      db
        .select({ id: userProfiles.id })
        .from(userProfiles)
        .where(
          or(
            // Defense-in-depth: a direct report only counts while it is still a
            // SALES profile, so a stale manager_id on a non-SALES user never
            // leaks that user's offers into this manager's scope.
            and(
              eq(userProfiles.manager_id, user.id),
              eq(userProfiles.role, "SALES"),
            ),
            eq(userProfiles.id, user.id),
          ),
        ),
    );
  }

  // Defensive: any other role fails closed.
  return sql`false`;
}

/**
 * Single-record access decision for one offer (with its owner's user_id). Mirrors
 * {@link offerScopeWhere}; ENGINEER is excluded entirely.
 */
export async function canAccessOffer(
  user: NonNullable<UserData>,
  offer: { user_id: string },
): Promise<boolean> {
  // ENGINEER and unknown roles have no offer access.
  if (!canViewOffer(user.role)) {
    return false;
  }
  // All-offer-access roles (ADMIN/SALES_DIRECTOR) see every offer.
  if (canAccessAllOffers(user.role)) {
    return true;
  }
  if (offer.user_id === user.id) {
    return true;
  }
  // SALES_MANAGER: in scope only if the offer owner reports to this manager.
  // Mirrors offerScopeWhere — the `role = SALES` filter is the same
  // defense-in-depth guard against a stale manager_id on a non-SALES profile.
  if (user.role === "SALES_MANAGER") {
    const report = await db.query.userProfiles.findFirst({
      where: and(
        eq(userProfiles.id, offer.user_id),
        eq(userProfiles.manager_id, user.id),
        eq(userProfiles.role, "SALES"),
      ),
      columns: { id: true },
    });
    return !!report;
  }
  // SALES (and any unrecognized role) fail closed: own offers only.
  return false;
}

/**
 * Status of the latest offer revision that owns this configuration, or `null` if
 * the config is not an offer line (standalone, or no line yet). Threaded into
 * {@link isEditable} so an OFFER config's pre-handoff edit gate keys on the
 * revision lifecycle (editable only while the revision is DRAFT). Post-acceptance
 * a config can sit on multiple revisions (renegotiations); the latest one governs.
 */
export async function getOfferRevisionStatusForConfig(
  configId: number,
  txOrDb: DatabaseType | TransactionType = db,
): Promise<OfferStatusType | null> {
  const [row] = await txOrDb
    .select({ status: offerRevisions.status })
    .from(offerRevisionLines)
    .innerJoin(
      offerRevisions,
      eq(offerRevisionLines.offer_revision_id, offerRevisions.id),
    )
    .where(eq(offerRevisionLines.configuration_id, configId))
    .orderBy(desc(offerRevisions.revision_no))
    .limit(1);

  return row?.status ?? null;
}

/**
 * Resolves the {@link isEditable} `offerRevisionStatus` argument for a config:
 * the owning revision's status for an OFFER config, or `undefined` for a
 * STANDALONE config (whose branch never consults it). Centralises the threading
 * so every editability call site stays consistent.
 */
export async function offerRevisionStatusFor(
  config: { id: number; origin: ConfigOrigin },
  txOrDb: DatabaseType | TransactionType = db,
): Promise<OfferStatusType | undefined> {
  if (config.origin !== "OFFER") return undefined;
  return (
    (await getOfferRevisionStatusForConfig(config.id, txOrDb)) ?? undefined
  );
}

/**
 * The offer that owns this configuration — its id (for navigation) and display
 * `offer_number` — or `null` if the config is not an offer line (standalone, or no
 * line yet). Mirrors {@link getOfferLinePricingForConfig}'s ordering so the
 * in-force accepted revision (`offers.accepted_revision_id`) wins, falling back to
 * the latest revision; only `offer_id` drives the link, so the exact revision
 * chosen is immaterial. Used to render a "back to offer" link on config pages.
 */
export async function getOfferRefForConfig(
  configId: number,
  txOrDb: DatabaseType | TransactionType = db,
): Promise<{ offerId: number; offerNumber: string } | null> {
  const [row] = await txOrDb
    .select({ offerId: offers.id, offerNumber: offers.offer_number })
    .from(offerRevisionLines)
    .innerJoin(
      offerRevisions,
      eq(offerRevisionLines.offer_revision_id, offerRevisions.id),
    )
    .innerJoin(offers, eq(offerRevisions.offer_id, offers.id))
    .where(eq(offerRevisionLines.configuration_id, configId))
    .orderBy(
      sql`(${offerRevisions.id} = ${offers.accepted_revision_id}) DESC NULLS LAST`,
      desc(offerRevisions.revision_no),
    )
    .limit(1);

  return row ?? null;
}

/**
 * Resolves the owning offer reference for a config: the offer id + number for an
 * OFFER config, or `null` for a STANDALONE config (which owns no offer line).
 * Parallels {@link offerRevisionStatusFor} — centralises the short-circuit so
 * call sites stay consistent.
 */
export async function offerRefFor(
  config: { id: number; origin: ConfigOrigin },
  txOrDb: DatabaseType | TransactionType = db,
): Promise<{ offerId: number; offerNumber: string } | null> {
  if (config.origin !== "OFFER") return null;
  return getOfferRefForConfig(config.id, txOrDb);
}

/**
 * Next offer number for the current year, formatted `OFF-{year}-{NNNN}`. Derived
 * from the max existing number for the year; relies on the `offer_number` UNIQUE
 * to reject the rare concurrent collision (caller surfaces a retry message).
 */
export async function generateOfferNumber(
  txOrDb: DatabaseType | TransactionType = db,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `OFF-${year}-`;
  const [row] = await txOrDb
    .select({ max: max(offers.offer_number) })
    .from(offers)
    .where(ilike(offers.offer_number, `${prefix}%`));

  const lastSeq = row?.max ? parseInt(row.max.slice(prefix.length), 10) : 0;
  const next = (Number.isNaN(lastSeq) ? 0 : lastSeq) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

/**
 * Creates an offer header plus its implicit revision 1 (DRAFT) atomically. The
 * offer number is generated server-side; the owner is the creating agent.
 */
export async function insertOffer(
  data: OfferHeaderInput,
  userId: string,
): Promise<{ id: number }> {
  return db.transaction(async (tx) => {
    const offer_number = await generateOfferNumber(tx);

    const [offer] = await tx
      .insert(offers)
      .values({
        offer_number,
        customer_name: data.customer_name,
        customer_address: data.customer_address || null,
        customer_email: data.customer_email || null,
        user_id: userId,
      })
      .returning({ id: offers.id });

    if (!offer) {
      throw new QueryError(MSG.offer.createFailed, 500);
    }

    await tx.insert(offerRevisions).values({
      offer_id: offer.id,
      revision_no: 1,
      status: "DRAFT",
    });

    return { id: offer.id };
  });
}

/**
 * Offer-side equivalent of {@link getUserConfigurations}: a scoped, paginated list
 * with each offer's **working revision** (the latest by `revision_no`) status and
 * line count.
 */
export async function getUserOffers(
  user: NonNullable<UserData>,
  page: number = 1,
  pageSize: number = 20,
) {
  const whereClause = offerScopeWhere(user);

  const [data, countResult] = await Promise.all([
    db.query.offers.findMany({
      where: whereClause,
      columns: {
        id: true,
        offer_number: true,
        customer_name: true,
        created_at: true,
        updated_at: true,
      },
      with: {
        owner: { columns: { id: true, email: true, initials: true } },
        revisions: {
          orderBy: [desc(offerRevisions.revision_no)],
          limit: 1,
          columns: { id: true, status: true },
          // Correlated count instead of loading the line rows just to count
          // them. The foreign table/column must be raw identifiers: drizzle
          // re-qualifies every schema-column reference inside `extras` to the
          // relation's alias, which would break the correlation. `fields.id`
          // resolves to the aliased revision; `::int` keeps it a JS number.
          extras: (fields, { sql }) => ({
            lineCount:
              sql<number>`(select count(*)::int from offer_revision_lines l
              where l.offer_revision_id = ${fields.id})`.as("line_count"),
          }),
        },
      },
      orderBy: [desc(offers.updated_at)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db.select({ count: sql<number>`count(*)` }).from(offers).where(whereClause),
  ]);

  const shaped = data.map((offer) => {
    const revision = offer.revisions[0];
    return {
      id: offer.id,
      offer_number: offer.offer_number,
      customer_name: offer.customer_name,
      created_at: offer.created_at,
      updated_at: offer.updated_at,
      owner: offer.owner,
      status: revision?.status ?? null,
      lineCount: revision?.lineCount ?? 0,
    };
  });

  return { data: shaped, totalCount: Number(countResult[0].count) };
}

export type AllOffers = Awaited<ReturnType<typeof getUserOffers>>["data"];

/**
 * Single offer with **all** its revisions ordered newest-first (`revision_no`
 * descending), each carrying its lines (each with a lightweight config summary)
 * ordered by position. `revisions[0]` is the **working revision** (the latest);
 * the rest are immutable history. Returns `null` when the offer doesn't exist or
 * is out of the user's scope.
 */
export async function getOfferWithRevisionAndLines(
  offerId: number,
  user: NonNullable<UserData>,
) {
  const offer = await db.query.offers.findFirst({
    where: eq(offers.id, offerId),
    with: {
      owner: { columns: { id: true, email: true, initials: true } },
      revisions: {
        orderBy: [desc(offerRevisions.revision_no)],
        with: {
          lines: {
            orderBy: [asc(offerRevisionLines.position)],
            with: {
              configuration: {
                columns: { id: true, name: true, status: true, origin: true },
              },
            },
          },
        },
      },
    },
  });

  if (!offer) return null;
  if (!(await canAccessOffer(user, offer))) return null;

  return offer;
}

export type OfferWithRevisionAndLines = NonNullable<
  Awaited<ReturnType<typeof getOfferWithRevisionAndLines>>
>;

/**
 * Scoped fetch of an offer's **working revision only** (latest by `revision_no`),
 * with just its id and status — for the mutation actions that need a scope check and
 * the working revision's lifecycle state, without eagerly loading the whole revision
 * history (and every line's `pricing_snapshot`). Returns `null` when the offer is
 * missing, out of the user's scope, or has no revision yet. Use
 * {@link getOfferWithRevisionAndLines} only where the full history is actually rendered.
 */
export async function getOfferWorkingRevision(
  offerId: number,
  user: NonNullable<UserData>,
): Promise<{ id: number; status: OfferStatusType } | null> {
  const offer = await db.query.offers.findFirst({
    where: eq(offers.id, offerId),
    columns: { user_id: true },
    with: {
      revisions: {
        orderBy: [desc(offerRevisions.revision_no)],
        limit: 1,
        columns: { id: true, status: true },
      },
    },
  });

  if (!offer) return null;
  if (!(await canAccessOffer(user, offer))) return null;

  return offer.revisions[0] ?? null;
}

/**
 * Serializes lifecycle mutations on an offer: takes the offer row lock, blocking
 * until any concurrent holder commits. Must be the **first statement** of every
 * structural offer transaction (add/remove line, clone, submit, send, accept,
 * unaccept) so the tx's subsequent reads see the previous holder's committed state.
 */
export async function lockOfferRow(
  offerId: number,
  tx: TransactionType,
): Promise<void> {
  await tx.execute(sql`select id from offers where id = ${offerId} for update`);
}

/**
 * Adds a new configuration line to an offer's **working revision** (the latest by
 * `revision_no`). Inserts the config with `origin=OFFER` owned by the **offer
 * owner** (not the acting user, so a manager adding to a report's offer doesn't
 * flip ownership) and an `offer_revision_lines` row at the next position with
 * placeholder pricing — the caller re-prices the line (via `repriceOfferLine`) in
 * the same transaction. Gated on the revision being DRAFT, under the offer row
 * lock so a concurrent submit cannot flip the revision out of DRAFT mid-add.
 * Audited in the caller's transaction.
 */
export async function addOfferLine(
  offerId: number,
  configData: ConfigSchema,
  userId: string,
  // Required: the caller owns the transaction so the config + line insert and the
  // OFFER_LINE_ADD audit (and the follow-up reprice) commit atomically.
  tx: TransactionType,
): Promise<{ id: number }> {
  // Serialize against concurrent lifecycle mutations (submit above all): the DRAFT
  // gate below is only meaningful while no submit can commit under us.
  await lockOfferRow(offerId, tx);

  const offer = await tx.query.offers.findFirst({
    where: eq(offers.id, offerId),
    columns: { id: true, user_id: true, accepted_revision_id: true },
    with: {
      revisions: {
        orderBy: [desc(offerRevisions.revision_no)],
        limit: 1,
        columns: { id: true, status: true },
      },
    },
  });

  if (!offer) throw new QueryError(MSG.offer.notFound, 404);
  const revision = offer.revisions[0];
  if (!revision) throw new QueryError(MSG.offer.notFound, 404);
  if (revision.status !== "DRAFT") {
    throw new QueryError(MSG.offer.lineCannotEdit, 403);
  }
  // A DRAFT revision on an accepted offer is a renegotiation: commercial-only,
  // its configuration set is fixed to the accepted revision's.
  if (offer.accepted_revision_id !== null) {
    throw new QueryError(MSG.offer.renegotiationLinesLocked, 403);
  }

  const { id: configId } = await insertConfiguration(
    configData,
    offer.user_id,
    "OFFER",
    tx,
  );

  const [posRow] = await tx
    .select({ max: max(offerRevisionLines.position) })
    .from(offerRevisionLines)
    .where(eq(offerRevisionLines.offer_revision_id, revision.id));
  const nextPosition = Number(posRow?.max ?? -1) + 1;

  await tx.insert(offerRevisionLines).values({
    offer_revision_id: revision.id,
    configuration_id: configId,
    position: nextPosition,
    quantity: 1,
    list_price: "0.00",
    net_price: "0.00",
    line_discount_percent: null,
    pricing_snapshot: null,
  });

  await insertActivityLog(
    {
      userId,
      action: "OFFER_LINE_ADD",
      targetEntity: "offer",
      targetId: String(offerId),
      metadata: { configurationId: configId, position: nextPosition },
    },
    tx,
  );

  return { id: configId };
}

/**
 * Tx-capable, unscoped loader of a configuration with its water tanks and wash
 * bays for BOM pricing. Unlike getConfigurationWithTanksAndBays it performs no
 * scope check (callers gate access upstream) and accepts a transaction so it can
 * read rows written earlier in the same tx.
 */
export async function loadConfigForPricing(
  configId: number,
  txOrDb: DatabaseType | TransactionType = db,
): Promise<ConfigurationWithWaterTanksAndWashBays | undefined> {
  return txOrDb.query.configurations.findFirst({
    where: eq(configurations.id, configId),
    with: {
      water_tanks: { orderBy: [asc(waterTanks.id)] },
      wash_bays: { orderBy: [asc(washBays.id)] },
    },
  });
}

/**
 * Resolves the offer revision line owning `configId` on the **latest** owning
 * revision, with the revision's discount and status, for re-pricing. Returns null
 * for a config that is not an offer line. A config referenced by renegotiation
 * revisions has one line per revision; the latest is the only possibly-DRAFT one
 * (older lines are frozen, and re-pricing no-ops on non-DRAFT revisions).
 */
export async function offerRevisionLineForConfig(
  configId: number,
  txOrDb: DatabaseType | TransactionType = db,
): Promise<{
  lineId: number;
  revisionId: number;
  discount_pct: string;
  status: OfferStatusType;
} | null> {
  const [row] = await txOrDb
    .select({
      lineId: offerRevisionLines.id,
      revisionId: offerRevisions.id,
      discount_pct: offerRevisions.discount_pct,
      status: offerRevisions.status,
    })
    .from(offerRevisionLines)
    .innerJoin(
      offerRevisions,
      eq(offerRevisionLines.offer_revision_id, offerRevisions.id),
    )
    .where(eq(offerRevisionLines.configuration_id, configId))
    .orderBy(desc(offerRevisions.revision_no))
    .limit(1);

  return row ?? null;
}

/**
 * Reads the offer revision line pricing for a configuration, for the margin page:
 * the as-sent `pricing_snapshot` (revenue reference) plus the derived net/list prices,
 * the revision discount/status, the at-acceptance as-sold freeze and the absorb
 * sign-off (with the absorber's email for display). Returns null for a config that
 * is not an offer line (e.g. standalone). A config referenced by renegotiation
 * revisions has one line per revision: the line on the **in-force accepted**
 * revision (`offers.accepted_revision_id`) is authoritative for the margin
 * baseline; pre-acceptance it falls back to the latest revision's line.
 */
export async function getOfferLinePricingForConfig(confId: number): Promise<{
  id: number;
  offer_id: number;
  revision_id: number;
  pricing_snapshot: OfferLineItem[] | null;
  net_price: string;
  list_price: string;
  discount_pct: string;
  revisionStatus: OfferStatusType;
  as_sold_snapshot: unknown;
  as_sold_frozen_at: Date | null;
  absorbed_by: string | null;
  absorbed_by_email: string | null;
  absorbed_at: Date | null;
  absorbed_margin_percent: string | null;
  absorbed_note: string | null;
} | null> {
  const [row] = await db
    .select({
      id: offerRevisionLines.id,
      offer_id: offerRevisions.offer_id,
      revision_id: offerRevisions.id,
      pricing_snapshot: offerRevisionLines.pricing_snapshot,
      net_price: offerRevisionLines.net_price,
      list_price: offerRevisionLines.list_price,
      discount_pct: offerRevisions.discount_pct,
      revisionStatus: offerRevisions.status,
      as_sold_snapshot: offerRevisionLines.as_sold_snapshot,
      as_sold_frozen_at: offerRevisionLines.as_sold_frozen_at,
      absorbed_by: offerRevisionLines.absorbed_by,
      absorbed_by_email: userProfiles.email,
      absorbed_at: offerRevisionLines.absorbed_at,
      absorbed_margin_percent: offerRevisionLines.absorbed_margin_percent,
      absorbed_note: offerRevisionLines.absorbed_note,
    })
    .from(offerRevisionLines)
    .innerJoin(
      offerRevisions,
      eq(offerRevisionLines.offer_revision_id, offerRevisions.id),
    )
    .leftJoin(userProfiles, eq(offerRevisionLines.absorbed_by, userProfiles.id))
    .innerJoin(offers, eq(offerRevisions.offer_id, offers.id))
    .where(eq(offerRevisionLines.configuration_id, confId))
    .orderBy(
      sql`(${offerRevisions.id} = ${offers.accepted_revision_id}) DESC NULLS LAST`,
      desc(offerRevisions.revision_no),
    )
    .limit(1);

  if (!row) return null;
  return {
    ...row,
    pricing_snapshot: (row.pricing_snapshot as OfferLineItem[] | null) ?? null,
  };
}

/** Persists a recomputed line's list/net price and pricing snapshot. */
export async function updateOfferRevisionLinePricing(
  lineId: number,
  pricing: {
    list_price: number;
    net_price: number;
    pricing_snapshot: OfferLineItem[];
  },
  txOrDb: DatabaseType | TransactionType = db,
): Promise<void> {
  await txOrDb
    .update(offerRevisionLines)
    .set({
      list_price: pricing.list_price.toFixed(2),
      net_price: pricing.net_price.toFixed(2),
      pricing_snapshot: pricing.pricing_snapshot,
      updated_at: new Date(),
    })
    .where(eq(offerRevisionLines.id, lineId));
}

/**
 * Clone-forward: creates a new offer revision by deep-cloning every line of a source
 * revision (its configuration + water tanks + wash bays) into fresh editable rows and
 * carrying the source revision's commercial header forward. The new revision gets the
 * next `revision_no` and starts in `DRAFT`; the source revision's rows are left
 * untouched (immutable history).
 *
 * Pricing is NOT computed here — the cloned lines start with placeholder pricing and
 * the caller re-prices each one via `repriceOfferLines` in the same transaction (kept in
 * the action layer to avoid a queries ↔ pricing import cycle). Returns the new
 * revision's id/number and the cloned configuration ids in line order.
 *
 * `sourceRevisionNo` defaults to the latest revision (the normal "next revision");
 * pass an earlier number to revert to it. The default is resolved **inside the
 * transaction** so it can't go stale against a concurrent send/create.
 *
 * Guards: the offer must not be accepted (clone-forward is the pre-acceptance path —
 * post-acceptance re-quoting goes through `createRenegotiationRevisionFrom`, which
 * references configs instead of cloning them) and its latest revision must be frozen
 * (status ≠ DRAFT) — only one working draft exists at a time. A `FOR UPDATE` lock on
 * the offer row serializes concurrent creates/sends so two callers can't mint the
 * same `revision_no`. Audited in the caller's transaction.
 */
export async function createOfferRevisionFrom(
  offerId: number,
  sourceRevisionNo: number | undefined,
  userId: string,
  // Required: clone + line inserts + audit must commit atomically with the caller's
  // re-pricing pass.
  tx: TransactionType,
): Promise<{ revisionId: number; revisionNo: number; configIds: number[] }> {
  // Serialize lifecycle mutations on this offer: a concurrent create/send blocks here
  // until we commit, so both can't read the same latest revision and clash on
  // revision_no (which would surface only as a generic unique-violation DB error).
  await lockOfferRow(offerId, tx);

  const offer = await tx.query.offers.findFirst({
    where: eq(offers.id, offerId),
    columns: { id: true, user_id: true, accepted_revision_id: true },
    with: {
      revisions: {
        orderBy: [desc(offerRevisions.revision_no)],
        with: {
          lines: {
            orderBy: [asc(offerRevisionLines.position)],
            with: {
              configuration: {
                with: {
                  water_tanks: { orderBy: [asc(waterTanks.id)] },
                  wash_bays: { orderBy: [asc(washBays.id)] },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!offer) throw new QueryError(MSG.offer.notFound, 404);
  if (offer.accepted_revision_id !== null) {
    throw new QueryError(MSG.offer.alreadyAccepted, 409);
  }

  const latest = offer.revisions[0];
  if (!latest) throw new QueryError(MSG.offer.notFound, 404);
  // Only one open working revision at a time: a new revision can be cloned forward only
  // once the latest has been sent (or otherwise closed). DRAFT/PENDING_APPROVAL/
  // APPROVED_TO_SEND are all still the active working revision.
  if (OPEN_REVISION_STATUSES.includes(latest.status)) {
    throw new QueryError(MSG.offer.workingRevisionExists, 409);
  }

  // Default to the latest revision; resolved here (in-tx) so it can't be stale.
  const resolvedSourceNo = sourceRevisionNo ?? latest.revision_no;
  const source = offer.revisions.find(
    (r) => r.revision_no === resolvedSourceNo,
  );
  if (!source) throw new QueryError(MSG.offer.notFound, 404);

  const newRevisionNo = latest.revision_no + 1;

  const [newRevision] = await tx
    .insert(offerRevisions)
    .values({
      offer_id: offerId,
      revision_no: newRevisionNo,
      status: "DRAFT",
      // Carry the commercial header forward; lifecycle stamps reset.
      discount_pct: source.discount_pct,
      transport_amount: source.transport_amount,
      transport_mode: source.transport_mode,
      installation_mode: source.installation_mode,
      installation_items: source.installation_items,
      show_net_total_only: source.show_net_total_only,
      // validity is a per-send commercial stamp, not a structural term: a fresh
      // working revision must re-establish its own validity rather than inherit the
      // source's (often already-expired) date.
      valid_until: null,
      notes: source.notes,
    })
    .returning({ id: offerRevisions.id });

  if (!newRevision) throw new QueryError(MSG.offer.createFailed, 500);

  // Each config clone needs its own returning id, but the line rows that reference
  // them are accumulated and inserted in a single batch after the loop.
  const configIds: number[] = [];
  const newLines: NewOfferRevisionLine[] = [];
  for (const line of source.lines) {
    const { id: newConfigId } = await cloneConfigurationRows(
      line.configuration,
      {
        // Offer configs are owned by the offer owner, not the acting user.
        userId: offer.user_id,
        name: line.configuration.name,
        status: "DRAFT",
        origin: "OFFER",
      },
      tx,
    );

    newLines.push({
      offer_revision_id: newRevision.id,
      configuration_id: newConfigId,
      position: line.position,
      quantity: line.quantity,
      list_price: "0.00",
      net_price: "0.00",
      line_discount_percent: line.line_discount_percent,
      pricing_snapshot: null,
    });

    configIds.push(newConfigId);
  }

  if (newLines.length > 0) {
    await tx.insert(offerRevisionLines).values(newLines);
  }

  await insertActivityLog(
    {
      userId,
      action: "OFFER_REVISION_CREATE",
      targetEntity: "offer",
      targetId: String(offerId),
      metadata: {
        revisionNo: newRevisionNo,
        fromRevisionNo: resolvedSourceNo,
        lineCount: source.lines.length,
      },
    },
    tx,
  );

  return {
    revisionId: newRevision.id,
    revisionNo: newRevisionNo,
    configIds,
  };
}

/**
 * Creates a post-acceptance **renegotiation revision**: a commercial-only revision
 * cloned from the in-force accepted revision (`offers.accepted_revision_id`, not the
 * latest — a rejected renegotiation may sit between). Unlike `createOfferRevisionFrom`
 * it does NOT deep-clone configurations / water tanks / wash bays: the new lines
 * reference the accepted lines' configurations read-only, so the customer is re-quoted
 * exactly what engineering says the machine currently is, and the configs stay
 * governed by the engineering status machine.
 *
 * Pricing is NOT computed here — lines start with placeholder pricing and the caller
 * re-prices them via `repriceOfferLines` in the same transaction (deriving the new
 * quote from the current engineering configs).
 *
 * Guards: the offer must be accepted, and its latest revision must be frozen — only
 * one open renegotiation at a time. A `FOR UPDATE` lock on the offer row serializes
 * concurrent creates/accepts. Audited in the caller's transaction.
 */
export async function createRenegotiationRevisionFrom(
  offerId: number,
  userId: string,
  // Required: revision + line inserts + audit must commit atomically with the
  // caller's re-pricing pass.
  tx: TransactionType,
): Promise<{ revisionId: number; revisionNo: number; configIds: number[] }> {
  // Serialize lifecycle mutations on this offer (see createOfferRevisionFrom).
  await lockOfferRow(offerId, tx);

  const offer = await tx.query.offers.findFirst({
    where: eq(offers.id, offerId),
    columns: { id: true, accepted_revision_id: true },
    with: {
      revisions: {
        orderBy: [desc(offerRevisions.revision_no)],
        with: {
          lines: { orderBy: [asc(offerRevisionLines.position)] },
        },
      },
    },
  });

  if (!offer) throw new QueryError(MSG.offer.notFound, 404);
  if (offer.accepted_revision_id === null) {
    throw new QueryError(MSG.offer.renegotiationNotAccepted, 409);
  }

  const latest = offer.revisions[0];
  if (!latest) throw new QueryError(MSG.offer.notFound, 404);
  if (OPEN_REVISION_STATUSES.includes(latest.status)) {
    throw new QueryError(MSG.offer.workingRevisionExists, 409);
  }

  const source = offer.revisions.find(
    (r) => r.id === offer.accepted_revision_id,
  );
  if (!source) throw new QueryError(MSG.offer.notFound, 404);

  const newRevisionNo = latest.revision_no + 1;

  const [newRevision] = await tx
    .insert(offerRevisions)
    .values({
      offer_id: offerId,
      revision_no: newRevisionNo,
      status: "DRAFT",
      // Carry the accepted revision's commercial header forward; lifecycle stamps
      // reset, and validity is re-established per send (see createOfferRevisionFrom).
      discount_pct: source.discount_pct,
      transport_amount: source.transport_amount,
      transport_mode: source.transport_mode,
      installation_mode: source.installation_mode,
      installation_items: source.installation_items,
      show_net_total_only: source.show_net_total_only,
      valid_until: null,
      notes: source.notes,
    })
    .returning({ id: offerRevisions.id });

  if (!newRevision) throw new QueryError(MSG.offer.createFailed, 500);

  // Reference the accepted lines' configurations — no clone. Snapshot and absorb
  // columns start clean: the re-freeze happens at re-acceptance.
  const configIds = source.lines.map((line) => line.configuration_id);
  if (source.lines.length > 0) {
    await tx.insert(offerRevisionLines).values(
      source.lines.map(
        (line): NewOfferRevisionLine => ({
          offer_revision_id: newRevision.id,
          configuration_id: line.configuration_id,
          position: line.position,
          quantity: line.quantity,
          list_price: "0.00",
          net_price: "0.00",
          line_discount_percent: line.line_discount_percent,
          pricing_snapshot: null,
        }),
      ),
    );
  }

  await insertActivityLog(
    {
      userId,
      action: "OFFER_REVISION_CREATE",
      targetEntity: "offer",
      targetId: String(offerId),
      metadata: {
        revisionNo: newRevisionNo,
        fromRevisionNo: source.revision_no,
        lineCount: source.lines.length,
        renegotiation: true,
      },
    },
    tx,
  );

  return {
    revisionId: newRevision.id,
    revisionNo: newRevisionNo,
    configIds,
  };
}

/**
 * Loads an offer's working revision (latest by `revision_no`) with the configuration
 * ids of its lines, for the send flow: the caller re-prices each line (while the
 * revision is still DRAFT) then freezes it via {@link markOfferRevisionSentWithAudit}.
 */
export async function getWorkingRevisionForSend(
  offerId: number,
  txOrDb: DatabaseType | TransactionType = db,
): Promise<{
  id: number;
  status: OfferStatusType;
  configIds: number[];
} | null> {
  const offer = await txOrDb.query.offers.findFirst({
    where: eq(offers.id, offerId),
    columns: { id: true },
    with: {
      revisions: {
        orderBy: [desc(offerRevisions.revision_no)],
        limit: 1,
        columns: { id: true, status: true },
        with: { lines: { columns: { configuration_id: true } } },
      },
    },
  });

  const revision = offer?.revisions[0];
  if (!revision) return null;

  return {
    id: revision.id,
    status: revision.status,
    configIds: revision.lines.map((l) => l.configuration_id),
  };
}

/**
 * Submits a working revision for manager approval: guards it is still DRAFT and
 * non-empty, flips `status = "PENDING_APPROVAL"`, and audits the transition. The lines
 * must already have been re-priced in the same transaction (submit is the last DRAFT
 * moment, so the `pricing_snapshot` the manager reviews is the as-submitted figure),
 * and the caller's tx must open with `lockOfferRow` so the line set it validated and
 * re-priced can't change under the CAS. Audited in the caller's tx.
 */
export async function submitOfferRevisionForApprovalWithAudit(
  offerId: number,
  revisionId: number,
  userId: string,
  tx: TransactionType,
): Promise<void> {
  // An empty revision must never enter approval — it would freeze as an empty as-sent
  // record at send. Same invariant as the send freeze, enforced here at the entry gate.
  const [lineCount] = await tx
    .select({ count: sql<number>`count(*)` })
    .from(offerRevisionLines)
    .where(eq(offerRevisionLines.offer_revision_id, revisionId));
  if (Number(lineCount?.count ?? 0) === 0) {
    throw new QueryError(MSG.offer.cannotSendEmpty, 422);
  }

  const [updated] = await tx
    .update(offerRevisions)
    .set({ status: "PENDING_APPROVAL", updated_at: new Date() })
    .where(
      and(
        eq(offerRevisions.id, revisionId),
        eq(offerRevisions.status, "DRAFT"),
      ),
    )
    .returning({ id: offerRevisions.id });

  // No row updated ⇒ the revision left DRAFT under us (concurrent submit/send).
  if (!updated) throw new QueryError(MSG.offer.cannotSubmit, 403);

  await insertActivityLog(
    {
      userId,
      action: "OFFER_REVISION_SUBMIT",
      targetEntity: "offer",
      targetId: String(offerId),
      metadata: { revisionId },
    },
    tx,
  );
}

/**
 * Approves a revision for send: guards it is PENDING_APPROVAL, flips
 * `status = "APPROVED_TO_SEND"` and stamps `approved_by` / `approved_at`, and audits
 * the transition. The acting user's approval authority (management role + scope) is
 * checked by the caller. Audited in the caller's tx.
 */
export async function approveOfferRevisionWithAudit(
  offerId: number,
  revisionId: number,
  userId: string,
  tx: TransactionType,
): Promise<void> {
  const [updated] = await tx
    .update(offerRevisions)
    .set({
      status: "APPROVED_TO_SEND",
      approved_by: userId,
      approved_at: new Date(),
      updated_at: new Date(),
    })
    .where(
      and(
        eq(offerRevisions.id, revisionId),
        eq(offerRevisions.status, "PENDING_APPROVAL"),
      ),
    )
    .returning({ id: offerRevisions.id });

  // No row updated ⇒ the revision left PENDING_APPROVAL under us.
  if (!updated) throw new QueryError(MSG.offer.cannotApprove, 403);

  await insertActivityLog(
    {
      userId,
      action: "OFFER_REVISION_APPROVE",
      targetEntity: "offer",
      targetId: String(offerId),
      metadata: { revisionId },
    },
    tx,
  );
}

/**
 * Returns a revision to DRAFT — a manager hand-back (from PENDING_APPROVAL) or
 * un-approve (from APPROVED_TO_SEND). Guards the current status matches `fromStatus`,
 * clears `approved_by` / `approved_at`, and audits the transition. Once back in DRAFT
 * the line configs unlock (the two-phase editability gate). Audited in the caller's tx.
 */
export async function returnOfferRevisionToDraftWithAudit(
  offerId: number,
  revisionId: number,
  userId: string,
  fromStatus: "PENDING_APPROVAL" | "APPROVED_TO_SEND",
  tx: TransactionType,
): Promise<void> {
  const [updated] = await tx
    .update(offerRevisions)
    .set({
      status: "DRAFT",
      approved_by: null,
      approved_at: null,
      updated_at: new Date(),
    })
    .where(
      and(
        eq(offerRevisions.id, revisionId),
        eq(offerRevisions.status, fromStatus),
      ),
    )
    .returning({ id: offerRevisions.id });

  // No row updated ⇒ the revision moved off `fromStatus` under us.
  if (!updated) throw new QueryError(MSG.offer.cannotReturnToDraft, 403);

  await insertActivityLog(
    {
      userId,
      action: "OFFER_REVISION_REJECT",
      targetEntity: "offer",
      targetId: String(offerId),
      metadata: { revisionId, from: fromStatus },
    },
    tx,
  );
}

/**
 * Freezes an approved revision as sent: guards it is APPROVED_TO_SEND and non-empty,
 * sets `status = "SENT"` and `sent_at`, and audits the transition. The lines were
 * already re-priced at submit (the last DRAFT moment), so no re-pricing happens here.
 * The caller's tx must open with `lockOfferRow` (single-writer offer lifecycle).
 * Audited in the caller's tx.
 */
export async function markOfferRevisionSentWithAudit(
  offerId: number,
  revisionId: number,
  userId: string,
  tx: TransactionType,
): Promise<void> {
  // An empty revision must never freeze as the immutable as-sent record. The guard
  // lives in the freeze primitive itself — not only in the send action — so every
  // caller (seed, approval flow) is held to it.
  const [lineCount] = await tx
    .select({ count: sql<number>`count(*)` })
    .from(offerRevisionLines)
    .where(eq(offerRevisionLines.offer_revision_id, revisionId));
  if (Number(lineCount?.count ?? 0) === 0) {
    throw new QueryError(MSG.offer.cannotSendEmpty, 422);
  }

  const [updated] = await tx
    .update(offerRevisions)
    .set({ status: "SENT", sent_at: new Date(), updated_at: new Date() })
    .where(
      and(
        eq(offerRevisions.id, revisionId),
        eq(offerRevisions.status, "APPROVED_TO_SEND"),
      ),
    )
    .returning({ id: offerRevisions.id });

  // No row updated ⇒ the revision moved out of APPROVED_TO_SEND under us.
  if (!updated) throw new QueryError(MSG.offer.cannotSend, 403);

  await insertActivityLog(
    {
      userId,
      action: "OFFER_REVISION_SEND",
      targetEntity: "offer",
      targetId: String(offerId),
      metadata: { revisionId },
    },
    tx,
  );
}

/**
 * Records customer acceptance of a SENT revision. In one transaction it:
 *  - locks the offer row, then guards the revision is SENT (the status-guarded
 *    update), is not the already-in-force accepted revision, and is still the
 *    offer's latest revision (a clone-forward or renegotiation revision committed
 *    in the race window supersedes the target — 409);
 *  - moves the revision SENT → ACCEPTED and points `offers.accepted_revision_id`
 *    at it (first acceptance locks the offer; a re-acceptance moves the pointer
 *    forward — the superseded revision keeps its immutable ACCEPTED status);
 *  - for each line: writes the at-acceptance as-sold freeze (`as_sold_snapshot` +
 *    `as_sold_frozen_at`) onto the line and audits it. On **first acceptance** it
 *    also flips the line's config to `SALES_APPROVED` (the engineering hand-off);
 *    on **re-acceptance** (a renegotiation revision, #85) config statuses are left
 *    untouched — the configs were handed off at first acceptance and stay governed
 *    by the engineering status machine. The new lines' clean absorb columns reset
 *    the margin baseline to the renegotiated prices.
 *
 * `asSoldByConfigId` carries each line config's form-shaped snapshot, loaded by the
 * caller (the action layer can build it without the circular import a load here would
 * create). After this, the existing per-config engineering flow runs unchanged.
 */
export async function acceptOfferRevisionWithAudit(
  offerId: number,
  revisionId: number,
  userId: string,
  asSoldByConfigId: Record<number, OfferConfigSnapshot>,
  tx: TransactionType,
): Promise<void> {
  // Serialize against concurrent lifecycle mutations on this offer.
  await lockOfferRow(offerId, tx);

  const offerRow = await tx.query.offers.findFirst({
    where: eq(offers.id, offerId),
    columns: { id: true, accepted_revision_id: true },
    with: {
      revisions: {
        orderBy: [desc(offerRevisions.revision_no)],
        columns: { id: true, revision_no: true },
      },
    },
  });
  if (!offerRow) throw new QueryError(MSG.offer.notFound, 404);
  // A set pointer means this acceptance is a renegotiation re-acceptance. Only the
  // in-force revision itself can't be accepted again; any other target must be SENT,
  // which the status-guarded update below enforces (a past accepted revision can
  // never be SENT again).
  const isReacceptance = offerRow.accepted_revision_id !== null;
  if (offerRow.accepted_revision_id === revisionId) {
    throw new QueryError(MSG.offer.alreadyAccepted, 409);
  }

  const target = offerRow.revisions.find((rev) => rev.id === revisionId);
  if (!target) throw new QueryError(MSG.offer.notFound, 404);

  // The target must still be the offer's latest revision. A clone-forward (or a new
  // renegotiation revision) committed between the action's in-tx re-read and this lock
  // would otherwise leave an accepted offer with an open working revision — a state
  // the workflow defines as impossible. `revisions` is desc by revision_no, so [0] is
  // the latest — refuse if it is past the target.
  const latest = offerRow.revisions[0];
  if (latest && latest.revision_no > target.revision_no) {
    throw new QueryError(MSG.offer.cannotAccept, 409);
  }

  const lines = await tx
    .select({
      lineId: offerRevisionLines.id,
      configId: offerRevisionLines.configuration_id,
      configStatus: configurations.status,
    })
    .from(offerRevisionLines)
    .innerJoin(
      configurations,
      eq(offerRevisionLines.configuration_id, configurations.id),
    )
    .where(eq(offerRevisionLines.offer_revision_id, revisionId));

  if (lines.length === 0) {
    throw new QueryError(MSG.offer.cannotSendEmpty, 422);
  }

  // SENT → ACCEPTED, guarded so a concurrent outcome can't slip past us.
  const [updated] = await tx
    .update(offerRevisions)
    .set({ status: "ACCEPTED", updated_at: new Date() })
    .where(
      and(eq(offerRevisions.id, revisionId), eq(offerRevisions.status, "SENT")),
    )
    .returning({ id: offerRevisions.id });
  if (!updated) throw new QueryError(MSG.offer.cannotAccept, 403);

  const now = new Date();

  await tx
    .update(offers)
    .set({ accepted_revision_id: revisionId, updated_at: now })
    .where(eq(offers.id, offerId));

  for (const line of lines) {
    const asSold = asSoldByConfigId[line.configId];
    if (!asSold) throw new QueryError(MSG.config.notFound, 404);

    // The engineering hand-off fires only at first acceptance: on re-acceptance the
    // configs are already SALES_APPROVED+ and must stay engineering-governed.
    if (!isReacceptance) {
      await tx
        .update(configurations)
        .set({ status: "SALES_APPROVED" })
        .where(eq(configurations.id, line.configId));

      await insertActivityLog(
        {
          userId,
          action: "CONFIG_STATUS_CHANGE",
          targetEntity: "configuration",
          targetId: line.configId.toString(),
          metadata: {
            from: line.configStatus,
            to: "SALES_APPROVED",
            via: "OFFER_ACCEPT",
          },
        },
        tx,
      );
    }

    await tx
      .update(offerRevisionLines)
      .set({
        as_sold_snapshot: asSold,
        as_sold_frozen_at: now,
        updated_at: now,
      })
      .where(eq(offerRevisionLines.id, line.lineId));

    await insertActivityLog(
      {
        userId,
        action: "CONFIG_AS_SOLD_FREEZE",
        targetEntity: "offer_revision_line",
        targetId: line.lineId.toString(),
        metadata: { configId: line.configId, revisionId },
      },
      tx,
    );
  }

  await insertActivityLog(
    {
      userId,
      action: "OFFER_REVISION_ACCEPT",
      targetEntity: "offer",
      targetId: String(offerId),
      metadata: {
        revisionId,
        renegotiation: isReacceptance,
        previousAcceptedRevisionId: offerRow.accepted_revision_id,
      },
    },
    tx,
  );
}

/**
 * ADMIN-only correction: undoes a mistaken acceptance, the exact inverse of
 * {@link acceptOfferRevisionWithAudit}. In one `FOR UPDATE`-locked transaction it:
 *  - guards that `revisionId` is the offer's **in-force** accepted revision;
 *  - guards this is a **first acceptance**, not a renegotiation re-acceptance (out of
 *    scope): if any earlier revision carries an as-sold-frozen line, throws;
 *  - guards **no engineering work has started**: every line config must still be
 *    exactly `SALES_APPROVED` (the clean hand-off) — else throws, so no technical
 *    work is ever destroyed;
 *  - moves the revision ACCEPTED → SENT (status-guarded) and clears
 *    `offers.accepted_revision_id`, unlocking the offer;
 *  - for each line: clears the as-sold freeze (`as_sold_snapshot` + `as_sold_frozen_at`,
 *    both together for the CHECK constraint) and reverts the config `SALES_APPROVED →
 *    DRAFT`, unwinding the engineering hand-off. Each step is audited.
 */
export async function unacceptOfferRevisionWithAudit(
  offerId: number,
  revisionId: number,
  userId: string,
  tx: TransactionType,
): Promise<void> {
  // Serialize against concurrent lifecycle mutations on this offer.
  await lockOfferRow(offerId, tx);

  const offer = await tx.query.offers.findFirst({
    where: eq(offers.id, offerId),
    columns: { id: true, accepted_revision_id: true },
    with: {
      revisions: {
        orderBy: [desc(offerRevisions.revision_no)],
        with: {
          lines: { columns: { as_sold_frozen_at: true } },
        },
      },
    },
  });
  if (!offer) throw new QueryError(MSG.offer.notFound, 404);
  // Only the in-force accepted revision can be un-accepted.
  if (offer.accepted_revision_id !== revisionId) {
    throw new QueryError(MSG.offer.cannotUnaccept, 403);
  }

  const target = offer.revisions.find((rev) => rev.id === revisionId);
  if (!target) throw new QueryError(MSG.offer.notFound, 404);

  // No later revision may exist. A renegotiation revision opened after this acceptance
  // (serialized by the offer lock above, but possibly created between the action's
  // pre-check and this tx) would be orphaned and misclassified as an ordinary editable
  // revision once the first as-sold freeze is cleared. `revisions` is desc by
  // revision_no, so [0] is the latest — refuse if it is past the target.
  const latest = offer.revisions[0];
  if (latest && latest.revision_no > target.revision_no) {
    throw new QueryError(MSG.offer.cannotUnaccept, 409);
  }

  // First-acceptance only: a renegotiation re-acceptance (a revision accepted after an
  // earlier one) is out of scope — the configs were handed off at first acceptance and
  // must not be dragged back. Anchored on the as-sold freeze, like the renegotiation
  // derivation (lib/offer-renegotiation.ts).
  const firstAcceptedNo = firstAcceptedRevisionNo(offer.revisions);
  if (firstAcceptedNo !== null && target.revision_no > firstAcceptedNo) {
    throw new QueryError(MSG.offer.unacceptRenegotiation, 409);
  }

  const lines = await tx
    .select({
      lineId: offerRevisionLines.id,
      configId: offerRevisionLines.configuration_id,
      configStatus: configurations.status,
    })
    .from(offerRevisionLines)
    .innerJoin(
      configurations,
      eq(offerRevisionLines.configuration_id, configurations.id),
    )
    .where(eq(offerRevisionLines.offer_revision_id, revisionId));

  // Engineering-started guard: the hand-off must still be clean. Any config past
  // SALES_APPROVED means the technical office has taken it in — refuse.
  if (lines.some((line) => line.configStatus !== "SALES_APPROVED")) {
    throw new QueryError(MSG.offer.unacceptEngineeringStarted, 409);
  }

  // ACCEPTED → SENT, guarded so a concurrent mutation can't slip past us.
  const [updated] = await tx
    .update(offerRevisions)
    .set({ status: "SENT", updated_at: new Date() })
    .where(
      and(
        eq(offerRevisions.id, revisionId),
        eq(offerRevisions.status, "ACCEPTED"),
      ),
    )
    .returning({ id: offerRevisions.id });
  if (!updated) throw new QueryError(MSG.offer.cannotUnaccept, 403);

  const now = new Date();

  await tx
    .update(offers)
    .set({ accepted_revision_id: null, updated_at: now })
    .where(eq(offers.id, offerId));

  for (const line of lines) {
    // Clear the as-sold freeze — both columns together (CHECK constraint).
    await tx
      .update(offerRevisionLines)
      .set({
        as_sold_snapshot: null,
        as_sold_frozen_at: null,
        updated_at: now,
      })
      .where(eq(offerRevisionLines.id, line.lineId));

    await insertActivityLog(
      {
        userId,
        action: "CONFIG_AS_SOLD_UNFREEZE",
        targetEntity: "offer_revision_line",
        targetId: line.lineId.toString(),
        metadata: { configId: line.configId, revisionId },
      },
      tx,
    );

    // Revert the engineering hand-off: SALES_APPROVED → DRAFT. Status-guarded so a
    // concurrent engineer transition (SALES_APPROVED → IN_TECH_REVIEW) that commits
    // between the read above and here can't be silently clobbered: if the row is no
    // longer SALES_APPROVED the guarded update matches nothing and we abort the whole
    // un-acceptance, preserving the engineering work (mirrors the revision guard above).
    const [reverted] = await tx
      .update(configurations)
      .set({ status: "DRAFT" })
      .where(
        and(
          eq(configurations.id, line.configId),
          eq(configurations.status, "SALES_APPROVED"),
        ),
      )
      .returning({ id: configurations.id });
    if (!reverted) {
      throw new QueryError(MSG.offer.unacceptEngineeringStarted, 409);
    }

    await insertActivityLog(
      {
        userId,
        action: "CONFIG_STATUS_CHANGE",
        targetEntity: "configuration",
        targetId: line.configId.toString(),
        metadata: {
          from: line.configStatus,
          to: "DRAFT",
          via: "OFFER_UNACCEPT",
        },
      },
      tx,
    );
  }

  await insertActivityLog(
    {
      userId,
      action: "OFFER_REVISION_UNACCEPT",
      targetEntity: "offer",
      targetId: String(offerId),
      metadata: { revisionId },
    },
    tx,
  );
}

/**
 * Records a non-accepting customer outcome on a SENT revision (REJECTED or EXPIRED).
 * Terminal for that revision and does not touch the configs or `accepted_revision_id` —
 * a new revision can still be cloned forward to try again. Audited in the caller's tx.
 */
export async function recordOfferRevisionOutcomeWithAudit(
  offerId: number,
  revisionId: number,
  userId: string,
  outcome: "REJECTED" | "EXPIRED",
  tx: TransactionType,
): Promise<void> {
  const [updated] = await tx
    .update(offerRevisions)
    .set({ status: outcome, updated_at: new Date() })
    .where(
      and(eq(offerRevisions.id, revisionId), eq(offerRevisions.status, "SENT")),
    )
    .returning({ id: offerRevisions.id });
  if (!updated) throw new QueryError(MSG.offer.cannotRecordOutcome, 403);

  await insertActivityLog(
    {
      userId,
      action:
        outcome === "REJECTED"
          ? "OFFER_REVISION_DECLINE"
          : "OFFER_REVISION_EXPIRE",
      targetEntity: "offer",
      targetId: String(offerId),
      metadata: { revisionId },
    },
    tx,
  );
}

/**
 * Removes a configuration line from an offer's **working revision** (the latest by
 * `revision_no`), deleting the line row and then its configuration (the FK is
 * `restrict`, so the line must go first). Gated on the revision being DRAFT and the
 * line actually belonging to that working revision, under the offer row lock so a
 * concurrent submit cannot flip the revision out of DRAFT mid-remove. Audited
 * in-transaction (delete ⇒ audit in the same tx).
 */
export async function removeOfferLine(
  offerId: number,
  configId: number,
  userId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    // Serialize against concurrent lifecycle mutations (submit above all): the
    // DRAFT gate below is only meaningful while no submit can commit under us.
    await lockOfferRow(offerId, tx);

    const offer = await tx.query.offers.findFirst({
      where: eq(offers.id, offerId),
      columns: { id: true, accepted_revision_id: true },
      with: {
        revisions: {
          orderBy: [desc(offerRevisions.revision_no)],
          limit: 1,
          columns: { id: true, status: true },
          with: {
            lines: {
              where: eq(offerRevisionLines.configuration_id, configId),
              columns: { id: true },
            },
          },
        },
      },
    });

    if (!offer) throw new QueryError(MSG.offer.notFound, 404);
    const revision = offer.revisions[0];
    if (!revision) throw new QueryError(MSG.offer.notFound, 404);
    if (revision.status !== "DRAFT") {
      throw new QueryError(MSG.offer.lineCannotEdit, 403);
    }
    // Renegotiation drafts reference engineering-owned configs read-only: removing
    // a line would delete the config itself (the line's config is deleted with it).
    if (offer.accepted_revision_id !== null) {
      throw new QueryError(MSG.offer.renegotiationLinesLocked, 403);
    }
    const line = revision.lines[0];
    if (!line) {
      throw new QueryError(MSG.offer.notFound, 404);
    }

    // Line first: configuration_id is onDelete restrict, so the config delete would
    // fail while the line still references it.
    await tx
      .delete(offerRevisionLines)
      .where(eq(offerRevisionLines.id, line.id));
    await tx.delete(configurations).where(eq(configurations.id, configId));

    await insertActivityLog(
      {
        userId,
        action: "OFFER_LINE_REMOVE",
        targetEntity: "offer",
        targetId: String(offerId),
        metadata: { configurationId: configId },
      },
      tx,
    );
  });
}

/**
 * Sets the revision header discount and re-derives every line's net_price from its
 * stored list_price (pure arithmetic — no BOM rebuild). Audited in the same
 * transaction so the recompute can never be recorded without its evidence.
 */
export async function updateRevisionDiscountWithAudit(data: {
  revisionId: number;
  discount_pct: string;
  updated_by: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ discount_pct: offerRevisions.discount_pct })
      .from(offerRevisions)
      .where(eq(offerRevisions.id, data.revisionId));

    if (!existing) throw new QueryError(MSG.offer.notFound, 404);

    await tx
      .update(offerRevisions)
      .set({ discount_pct: data.discount_pct, updated_at: new Date() })
      .where(eq(offerRevisions.id, data.revisionId));

    // Re-derive every line's net_price from its stored list_price in one set-based
    // UPDATE (pure arithmetic, no BOM rebuild, no per-line round-trip). Mirrors
    // computeNetPrice in lib/utils — Postgres round() and Math.round both round
    // half away from zero for non-negative money values.
    const factor = 1 - Number(data.discount_pct) / 100;
    await tx
      .update(offerRevisionLines)
      .set({
        net_price: sql`round(${offerRevisionLines.list_price} * ${factor}::numeric, 2)`,
        updated_at: new Date(),
      })
      .where(eq(offerRevisionLines.offer_revision_id, data.revisionId));

    await insertActivityLog(
      {
        userId: data.updated_by,
        action: "OFFER_REVISION_DISCOUNT_SET",
        targetEntity: "offer_revision",
        targetId: data.revisionId.toString(),
        metadata: {
          previous_pct: existing.discount_pct,
          new_pct: data.discount_pct,
        },
      },
      tx,
    );
  });
}

export type RevisionSettingsUpdate = {
  show_net_total_only: boolean;
  transport_amount: string;
  transport_mode: TransportMode;
  installation_mode: TransportMode;
  installation_items: OfferInstallationItem[];
};

/**
 * Updates the revision header transport/installation/presentation settings. These
 * are offer-level add-ons that do not affect per-line list/net prices, so no line
 * recompute is needed. Audited in the same transaction.
 */
export async function updateRevisionSettingsWithAudit(data: {
  revisionId: number;
  settings: RevisionSettingsUpdate;
  updated_by: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        show_net_total_only: offerRevisions.show_net_total_only,
        transport_amount: offerRevisions.transport_amount,
        transport_mode: offerRevisions.transport_mode,
        installation_mode: offerRevisions.installation_mode,
        installation_items: offerRevisions.installation_items,
      })
      .from(offerRevisions)
      .where(eq(offerRevisions.id, data.revisionId));

    if (!existing) throw new QueryError(MSG.offer.notFound, 404);

    await tx
      .update(offerRevisions)
      .set({ ...data.settings, updated_at: new Date() })
      .where(eq(offerRevisions.id, data.revisionId));

    await insertActivityLog(
      {
        userId: data.updated_by,
        action: "OFFER_REVISION_SETTINGS_SET",
        targetEntity: "offer_revision",
        targetId: data.revisionId.toString(),
        metadata: { old_value: existing, new_value: data.settings },
      },
      tx,
    );
  });
}

/**
 * Persists a margin absorb sign-off on an offer revision line and writes the
 * audit log in a single transaction. The line row is locked and the state
 * gates (revision ACCEPTED, as-sold freeze present) re-checked inside the
 * transaction — the action's pre-checks run outside it and could race. A
 * re-absorb overwrites the previous decision; the audit metadata carries the
 * prior values so the history stays reconstructable.
 */
export async function absorbOfferLineMarginWithAudit(data: {
  lineId: number;
  offerId: number;
  configId: number;
  revisionId: number;
  absorbedBy: string;
  /** Server-computed live margin at sign-off, already fixed to 2 decimals. */
  absorbedMarginPct: string;
  thresholdPct: number;
  note: string | null;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [line] = await tx
      .select({
        revision_status: offerRevisions.status,
        as_sold_frozen_at: offerRevisionLines.as_sold_frozen_at,
        absorbed_by: offerRevisionLines.absorbed_by,
        absorbed_at: offerRevisionLines.absorbed_at,
        absorbed_margin_percent: offerRevisionLines.absorbed_margin_percent,
      })
      .from(offerRevisionLines)
      .innerJoin(
        offerRevisions,
        eq(offerRevisionLines.offer_revision_id, offerRevisions.id),
      )
      .where(eq(offerRevisionLines.id, data.lineId))
      .for("update", { of: offerRevisionLines });

    if (
      !line ||
      line.revision_status !== "ACCEPTED" ||
      line.as_sold_frozen_at === null
    ) {
      throw new QueryError(MSG.marginReview.absorbNotAccepted, 409);
    }

    await tx
      .update(offerRevisionLines)
      .set({
        absorbed_by: data.absorbedBy,
        absorbed_at: new Date(),
        absorbed_margin_percent: data.absorbedMarginPct,
        absorbed_note: data.note,
        updated_at: new Date(),
      })
      .where(eq(offerRevisionLines.id, data.lineId));

    await insertActivityLog(
      {
        userId: data.absorbedBy,
        action: "OFFER_LINE_MARGIN_ABSORB",
        targetEntity: "offer_revision_line",
        targetId: data.lineId.toString(),
        metadata: {
          offerId: data.offerId,
          revisionId: data.revisionId,
          configId: data.configId,
          absorbedMarginPct: data.absorbedMarginPct,
          thresholdPct: data.thresholdPct,
          note: data.note,
          previous: {
            absorbedBy: line.absorbed_by,
            absorbedAt: line.absorbed_at,
            absorbedMarginPct: line.absorbed_margin_percent,
          },
        },
      },
      tx,
    );
  });
}
