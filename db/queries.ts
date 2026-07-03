import {
  and,
  asc,
  countDistinct,
  desc,
  eq,
  ilike,
  inArray,
  max,
  or,
  sql,
} from "drizzle-orm";
import { canTransition } from "@/app/actions/lib/auth-checks";
import { db } from "@/db";
import {
  activityLogs,
  bomLines,
  type ConfigurationWithWaterTanksAndWashBays,
  configurations,
  engineeringBomItems,
  type InstallationItemSetting,
  installationItemSettings,
  type NewConfiguration,
  type NewEngineeringBomItem,
  type NewOfferRevisionLine,
  type NewWashBay,
  type NewWaterTank,
  offerRevisionLines,
  offerRevisions,
  offers,
  partNumbers,
  priceCoefficients,
  type SurchargeSetting,
  surchargeSettings,
  userProfiles,
  washBays,
  waterTanks,
} from "@/db/schemas";
import {
  canAccessAllConfigs,
  canAccessAllOffers,
  canViewOffer,
} from "@/lib/access";
import { BOM } from "@/lib/BOM";
import { MSG } from "@/lib/messages";
import { getTransitionDirection } from "@/lib/status-config";
import type {
  ActivityAction,
  CoefficientSource,
  ConfigOrigin,
  ConfigurationStatusType,
  InstallationItemKind,
  OfferStatusType,
  Role,
  SurchargeKind,
  TransportMode,
} from "@/types";
import {
  HANDED_OFF_STATUSES,
  OPEN_REVISION_STATUSES,
  PRE_HANDOFF_STATUSES,
} from "@/types";
import { createClient } from "@/utils/supabase/server";
import type {
  ConfigSchema,
  UpdateConfigSchema,
} from "@/validation/config-schema";
import type { ConfigStatusSchema } from "@/validation/config-status-schema";
import type { OfferHeaderInput } from "@/validation/offer/offer-schema";
import type { OfferConfigSnapshot } from "@/validation/offer-config-snapshot-schema";
import type {
  OfferInstallationItem,
  OfferLineItem,
} from "@/validation/offer-schema";
import type { WashBaySchema } from "@/validation/wash-bay-schema";
import type { WaterTankSchema } from "@/validation/water-tank-schema";
import {
  transformConfigToDbInsert,
  transformConfigToDbUpdate,
  transformWashBaySchemaToDbData,
  transformWaterTankSchemaToDbData,
} from "./transformations";

export type DatabaseType = typeof db;
export type TransactionType = Parameters<
  Parameters<DatabaseType["transaction"]>[0]
>[0];

export type AllConfigurations = Awaited<
  ReturnType<typeof getUserConfigurations>
>["data"];

export type UserData = Awaited<ReturnType<typeof getUserData>>;

export class QueryError extends Error {
  errorCode: number;

  constructor(message: string, errorCode: number) {
    super(message);
    this.name = "QueryError";
    this.errorCode = errorCode;

    Object.setPrototypeOf(this, QueryError.prototype);
  }
}

export const getUserData = async () => {
  const supabase = await createClient();
  const { error, data } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  if (!data.user) {
    return null;
  }

  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, data.user.id),
    columns: { role: true, initials: true, manager_id: true },
  });

  if (!userProfile) {
    return null;
  }

  return {
    id: data.user.id,
    role: userProfile.role,
    initials: userProfile.initials,
    manager_id: userProfile.manager_id,
  };
};

/**
 * Builds the WHERE fragment that scopes a configuration list/count to what the
 * given user may see. Returns `undefined` for "see everything" so it composes
 * with an absent filter.
 * - SALES: own configurations only.
 * - SALES_MANAGER: own + direct reports' configurations.
 * - SALES_DIRECTOR/ENGINEER/ADMIN: all configurations.
 */
export function configScopeWhere(user: NonNullable<UserData>) {
  // All-access roles (ADMIN/ENGINEER/SALES_DIRECTOR) see everything.
  if (canAccessAllConfigs(user.role)) {
    return undefined;
  }

  if (user.role === "SALES") {
    return eq(configurations.user_id, user.id);
  }

  if (user.role === "SALES_MANAGER") {
    return inArray(
      configurations.user_id,
      db
        .select({ id: userProfiles.id })
        .from(userProfiles)
        .where(
          or(
            // Defense-in-depth: a direct report only counts while it is still a
            // SALES profile, so a stale manager_id on a non-SALES user never
            // leaks that user's configs into this manager's scope.
            and(
              eq(userProfiles.manager_id, user.id),
              eq(userProfiles.role, "SALES"),
            ),
            eq(userProfiles.id, user.id),
          ),
        ),
    );
  }

  // Any unrecognized role fails closed: match no rows rather than all rows.
  return sql`false`;
}

/**
 * Single-record access decision used once a configuration row (with its owner's
 * user_id) is in hand. Mirrors {@link configScopeWhere} for one record.
 */
export async function canAccessConfiguration(
  user: NonNullable<UserData>,
  config: {
    user_id: string;
    origin: ConfigOrigin;
    status: ConfigurationStatusType;
  },
): Promise<boolean> {
  // ENGINEER has no offer access: a pre-handoff OFFER config (DRAFT/IN_SALES_REVIEW)
  // belongs to the sales workflow and is invisible to engineers, even by direct URL.
  // Checked before the all-access shortcut since ENGINEER is otherwise all-access.
  // Once handed off (SALES_APPROVED+) the engineer picks it up like any config.
  if (
    user.role === "ENGINEER" &&
    config.origin === "OFFER" &&
    PRE_HANDOFF_STATUSES.includes(config.status)
  ) {
    return false;
  }

  // All-access roles (ADMIN/ENGINEER/SALES_DIRECTOR) see every configuration.
  if (canAccessAllConfigs(user.role)) {
    return true;
  }
  if (config.user_id === user.id) {
    return true;
  }
  // SALES_MANAGER: in scope only if the config owner reports to this manager.
  // Mirrors configScopeWhere — the `role = SALES` filter is the same
  // defense-in-depth guard against a stale manager_id on a non-SALES profile.
  if (user.role === "SALES_MANAGER") {
    const report = await db.query.userProfiles.findFirst({
      where: and(
        eq(userProfiles.id, config.user_id),
        eq(userProfiles.manager_id, user.id),
        eq(userProfiles.role, "SALES"),
      ),
      columns: { id: true },
    });
    return !!report;
  }
  // SALES (and any unrecognized role) fail closed: own configs only.
  return false;
}

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
            eq(userProfiles.manager_id, user.id),
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
  if (user.role === "SALES_MANAGER") {
    const report = await db.query.userProfiles.findFirst({
      where: and(
        eq(userProfiles.id, offer.user_id),
        eq(userProfiles.manager_id, user.id),
      ),
      columns: { id: true },
    });
    return !!report;
  }
  // SALES (and any unrecognized role) fail closed: own offers only.
  return false;
}

/**
 * Status of the offer revision that owns this configuration, or `null` if the
 * config is not an offer line (standalone, or no line yet). Threaded into
 * {@link isEditable} so an OFFER config's pre-handoff edit gate keys on the
 * revision lifecycle (editable only while the revision is DRAFT).
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
          with: { lines: { columns: { id: true } } },
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
      lineCount: revision?.lines.length ?? 0,
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
 * Adds a new configuration line to an offer's **working revision** (the latest by
 * `revision_no`). Inserts the config with `origin=OFFER` owned by the **offer
 * owner** (not the acting user, so a manager adding to a report's offer doesn't
 * flip ownership) and an `offer_revision_lines` row at the next position with
 * placeholder pricing — the caller re-prices the line (via `repriceOfferLine`) in
 * the same transaction. Gated on the revision being DRAFT. Audited in the caller's
 * transaction.
 */
export async function addOfferLine(
  offerId: number,
  configData: ConfigSchema,
  userId: string,
  // Required: the caller owns the transaction so the config + line insert and the
  // OFFER_LINE_ADD audit (and the follow-up reprice) commit atomically.
  txOrDb: DatabaseType | TransactionType,
): Promise<{ id: number }> {
  const offer = await txOrDb.query.offers.findFirst({
    where: eq(offers.id, offerId),
    columns: { id: true, user_id: true },
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

  const { id: configId } = await insertConfiguration(
    configData,
    offer.user_id,
    "OFFER",
    txOrDb,
  );

  const [posRow] = await txOrDb
    .select({ max: max(offerRevisionLines.position) })
    .from(offerRevisionLines)
    .where(eq(offerRevisionLines.offer_revision_id, revision.id));
  const nextPosition = Number(posRow?.max ?? -1) + 1;

  await txOrDb.insert(offerRevisionLines).values({
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
    txOrDb,
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
 * Resolves the offer revision line owning `configId`, with the revision's discount
 * and status, for re-pricing. Returns null for a config that is not an offer line.
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
    .limit(1);

  return row ?? null;
}

/**
 * Reads the offer revision line pricing for a configuration, for the margin page:
 * the as-sent `pricing_snapshot` (revenue reference) plus the derived net/list prices,
 * the revision discount/status, the at-acceptance as-sold freeze and the absorb
 * sign-off (with the absorber's email for display). Returns null for a config that
 * is not an offer line (e.g. standalone). The unique on `configuration_id` means
 * at most one line per config.
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
    .where(eq(offerRevisionLines.configuration_id, confId))
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
 * Guards: the offer's latest revision must be frozen (status ≠ DRAFT) — only one
 * working draft exists at a time. A `FOR UPDATE` lock on the offer row serializes
 * concurrent creates/sends so two callers can't mint the same `revision_no`. Audited
 * in the caller's transaction.
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
  await tx.execute(sql`select id from offers where id = ${offerId} for update`);

  const offer = await tx.query.offers.findFirst({
    where: eq(offers.id, offerId),
    columns: { id: true, user_id: true },
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
 * moment — once it leaves DRAFT, `repriceOfferLine` no-ops, so the `pricing_snapshot`
 * the manager reviews is the as-submitted figure). Audited in the caller's tx.
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
 * already re-priced at submit (the last DRAFT moment), so no re-pricing happens here —
 * `repriceOfferLine` no-ops once a revision leaves DRAFT. Audited in the caller's tx.
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
 * Records customer acceptance of a SENT revision and hands every line config off to
 * engineering. In one transaction it:
 *  - locks the offer row, then guards the offer is not already accepted and the
 *    revision is SENT;
 *  - moves the revision SENT → ACCEPTED and sets `offers.accepted_revision_id`
 *    (locking the offer — no further revisions);
 *  - for each line: flips its config to `SALES_APPROVED`, writes the at-acceptance
 *    as-sold freeze (`as_sold_snapshot` + `as_sold_frozen_at`) onto the line, and
 *    audits the status change and the freeze.
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
  await tx.execute(sql`select id from offers where id = ${offerId} for update`);

  const [offerRow] = await tx
    .select({ accepted_revision_id: offers.accepted_revision_id })
    .from(offers)
    .where(eq(offers.id, offerId));
  if (!offerRow) throw new QueryError(MSG.offer.notFound, 404);
  if (offerRow.accepted_revision_id !== null) {
    throw new QueryError(MSG.offer.alreadyAccepted, 409);
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

    await tx
      .update(configurations)
      .set({ status: "SALES_APPROVED" })
      .where(eq(configurations.id, line.configId));

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
 * `revision_no`) by deleting its configuration (the line row cascades via the FK).
 * Gated on the revision being DRAFT and the line actually belonging to that working
 * revision. Audited in-transaction (delete ⇒ audit in the same tx).
 */
export async function removeOfferLine(
  offerId: number,
  configId: number,
  userId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const offer = await tx.query.offers.findFirst({
      where: eq(offers.id, offerId),
      columns: { id: true },
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
    if (revision.lines.length === 0) {
      throw new QueryError(MSG.offer.notFound, 404);
    }

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

// Builds the engineer/admin "Technical" config queue: every STANDALONE config
// (all statuses) plus OFFER-origin configs that have been handed off to
// engineering (`SALES_APPROVED`+). Pre-handoff offer configs (`DRAFT`/
// `IN_SALES_REVIEW`) stay in the sales workflow and never surface here.
// Visibility is further scoped per role via `configScopeWhere`.
export async function getUserConfigurations(
  user: NonNullable<UserData>,
  page: number = 1,
  pageSize: number = 20,
) {
  const scopeWhere = configScopeWhere(user);
  const technicalQueueWhere = or(
    eq(configurations.origin, "STANDALONE"),
    and(
      eq(configurations.origin, "OFFER"),
      inArray(configurations.status, HANDED_OFF_STATUSES),
    ),
  );
  const whereClause = scopeWhere
    ? and(scopeWhere, technicalQueueWhere)
    : technicalQueueWhere;

  const [data, countResult] = await Promise.all([
    db.query.configurations.findMany({
      where: whereClause,
      columns: {
        id: true,
        status: true,
        name: true,
        description: true,
        origin: true,
        created_at: true,
        updated_at: true,
      },
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            initials: true,
          },
        },
      },
      orderBy: [desc(configurations.updated_at)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(configurations)
      .where(whereClause),
  ]);

  return { data, totalCount: Number(countResult[0].count) };
}

export async function getConfigurationWithTanksAndBays(
  id: number,
  user: NonNullable<UserData>,
) {
  const response = await db.query.configurations.findFirst({
    where: eq(configurations.id, id),
    with: {
      water_tanks: {
        orderBy: [asc(waterTanks.id)],
      },
      wash_bays: {
        orderBy: [asc(washBays.id)],
      },
    },
  });

  // Scope check: SALES sees own, SALES_MANAGER sees own + reports, others see all
  if (response && !(await canAccessConfiguration(user, response))) {
    return null;
  }

  return response;
}

export async function getConfiguration(id: number) {
  const response = await db.query.configurations.findFirst({
    where: eq(configurations.id, id),
  });
  return response;
}

export async function getWashBaysByConfigId(configId: number) {
  return db.query.washBays.findMany({
    where: eq(washBays.configuration_id, configId),
    columns: { id: true, has_gantry: true, energy_chain_width: true },
  });
}

export const insertConfiguration = async (
  newConfiguration: ConfigSchema,
  userId: string,
  origin: ConfigOrigin = "STANDALONE",
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const dbData = transformConfigToDbInsert(newConfiguration, userId);

  const [insertedConfiguration] = await txOrDb
    .insert(configurations)
    .values({ ...dbData, origin })
    .returning({ id: configurations.id });

  if (!insertedConfiguration) {
    throw new QueryError(MSG.config.createFailed, 500);
  }

  return insertedConfiguration;
};

/**
 * Strips a configuration child row (water tank / wash bay) of its identity and
 * timestamps and re-points it at `newConfigId`, yielding an insert payload. Every
 * child table goes through this one contract, so the set of dropped columns can't
 * drift between them as new child tables are added.
 */
function repointChildRow<
  TRow extends {
    id: number;
    created_at: Date;
    updated_at: Date;
    configuration_id: number;
  },
>(row: TRow, newConfigId: number) {
  const {
    id: _id,
    created_at: _ca,
    updated_at: _ua,
    configuration_id: _cid,
    ...rest
  } = row;
  return { ...rest, configuration_id: newConfigId };
}

/**
 * Tx-capable deep-clone primitive: copies a configuration row plus all of its
 * water tanks and wash bays into brand-new rows, dropping ids/timestamps and the
 * children's `configuration_id` (re-pointed at the new config via
 * {@link repointChildRow}). The caller supplies the new owner, name and status.
 * Engineering BOM items and offer snapshots are deliberately NOT cloned — a fresh
 * config recomputes its BOM live.
 *
 * Shared by {@link duplicateConfigurationRecord} (user-facing duplicate) and
 * {@link createOfferRevisionFrom} (offer clone-forward).
 */
const cloneConfigurationRows = async (
  source: ConfigurationWithWaterTanksAndWashBays,
  options: {
    userId: string;
    name: string;
    status: ConfigurationStatusType;
    origin?: ConfigOrigin;
  },
  tx: DatabaseType | TransactionType,
): Promise<{ id: number }> => {
  // `origin` stays in `...rest` so it is preserved from the source by default; an
  // explicit `options.origin` overrides it (clone-forward pins the clones to OFFER).
  const {
    id: _id,
    created_at: _ca,
    updated_at: _ua,
    user_id: _uid,
    status: _s,
    water_tanks: _wt,
    wash_bays: _wb,
    ...rest
  } = source;

  const newConfigValues: NewConfiguration = {
    ...rest,
    user_id: options.userId,
    status: options.status,
    name: options.name.slice(0, 255),
    ...(options.origin ? { origin: options.origin } : {}),
  };

  const [newConfig] = await tx
    .insert(configurations)
    .values(newConfigValues)
    .returning({ id: configurations.id });

  if (!newConfig) {
    throw new QueryError(MSG.config.duplicateFailed, 500);
  }

  if (source.water_tanks.length > 0) {
    const newTanks: NewWaterTank[] = source.water_tanks.map((t) =>
      repointChildRow(t, newConfig.id),
    );
    await tx.insert(waterTanks).values(newTanks);
  }

  if (source.wash_bays.length > 0) {
    const newBays: NewWashBay[] = source.wash_bays.map((b) =>
      repointChildRow(b, newConfig.id),
    );
    await tx.insert(washBays).values(newBays);
  }

  return newConfig;
};

export const duplicateConfigurationRecord = async (
  source: ConfigurationWithWaterTanksAndWashBays,
  newUserId: string,
): Promise<{ id: number }> => {
  return db.transaction(async (tx) =>
    cloneConfigurationRows(
      source,
      {
        userId: newUserId,
        name: `Copia di ${source.name}`,
        status: "DRAFT",
      },
      tx,
    ),
  );
};

export const deleteConfiguration = async (
  id: number,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  await txOrDb.delete(configurations).where(eq(configurations.id, id));
};

export const updateConfiguration = async (
  confId: number,
  configurationData: UpdateConfigSchema,
  txOrDb: DatabaseType | TransactionType = db,
): Promise<{ id: number }> => {
  const setData = transformConfigToDbUpdate(configurationData);

  const [updatedConfiguration] = await txOrDb
    .update(configurations)
    .set(setData)
    .where(eq(configurations.id, confId))
    .returning({ id: configurations.id });

  if (!updatedConfiguration) {
    throw new QueryError(MSG.config.notFound, 404);
  }

  return updatedConfiguration;
};

export const touchConfigurationUpdatedAt = async (
  confId: number,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  await txOrDb
    .update(configurations)
    .set({ updated_at: new Date() })
    .where(eq(configurations.id, confId));
};

export const updateConfigStatus = async (
  confId: number,
  user: NonNullable<UserData>,
  statusData: ConfigStatusSchema,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const configuration = await getConfiguration(confId);

  if (!configuration) {
    throw new QueryError(MSG.config.notFound, 404);
  }

  if (configuration.status === statusData.status) {
    throw new QueryError(MSG.config.statusAlreadyUpdated, 400);
  }

  if (!(await canAccessConfiguration(user, configuration))) {
    throw new QueryError(MSG.auth.userUnauthorized, 403);
  }

  if (
    !canTransition(
      user.role,
      configuration.status,
      statusData.status,
      configuration.origin,
    )
  ) {
    throw new QueryError(MSG.config.statusUnauthorized, 403);
  }

  if (statusData.status === "TECH_APPROVED") {
    const bomExists = await hasEngineeringBom(confId);
    if (!bomExists) {
      throw new QueryError(MSG.config.approvedRequiresBom, 400);
    }
  }

  // Cross-entity validation: ENERGY_CHAIN requires at least one wash bay with gantry + width
  if (
    configuration.supply_type === "ENERGY_CHAIN" &&
    getTransitionDirection(
      configuration.status as ConfigurationStatusType,
      statusData.status,
    ) === "forward"
  ) {
    const bays = await getWashBaysByConfigId(confId);
    const hasValidBay = bays.some(
      (wb) => wb.has_gantry && wb.energy_chain_width,
    );
    if (!hasValidBay) {
      throw new QueryError(MSG.config.energyChainRequiresGantry, 400);
    }
  }

  const fromStatus = configuration.status;

  const [response] = await txOrDb
    .update(configurations)
    .set({ status: statusData.status })
    .where(eq(configurations.id, confId))
    .returning({ id: configurations.id });

  if (!response) {
    throw new QueryError(MSG.config.updateNotFoundOrUnauthorized, 404);
  }

  return { id: response.id, fromStatus };
};

export const insertWaterTank = async (
  confId: number,
  newWaterTank: WaterTankSchema,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const dbData = transformWaterTankSchemaToDbData(newWaterTank);

  const [id] = await txOrDb
    .insert(waterTanks)
    .values({ ...dbData, configuration_id: confId })
    .returning({ id: waterTanks.id });

  return { success: true, id };
};

export const updateWaterTank = async (
  confId: number,
  waterTankId: number,
  waterTank: WaterTankSchema,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const dbData = transformWaterTankSchemaToDbData(waterTank);

  const [id] = await txOrDb
    .update(waterTanks)
    .set(dbData)
    .where(
      and(
        eq(waterTanks.id, waterTankId),
        eq(waterTanks.configuration_id, confId),
      ),
    )
    .returning({ id: waterTanks.id });

  return { success: true, id };
};

export const deleteWaterTank = async (
  confId: number,
  waterTankId: number,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const [id] = await txOrDb
    .delete(waterTanks)
    .where(
      and(
        eq(waterTanks.id, waterTankId),
        eq(waterTanks.configuration_id, confId),
      ),
    )
    .returning({ id: waterTanks.id });

  return { success: true, id };
};

export const insertWashBay = async (
  confId: number,
  newWashBay: WashBaySchema,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const dbData = transformWashBaySchemaToDbData(newWashBay);

  const [id] = await txOrDb
    .insert(washBays)
    .values({ ...dbData, configuration_id: confId })
    .returning({ id: washBays.id });

  return { success: true, id };
};

export const updateWashBay = async (
  confId: number,
  washBayId: number,
  washBay: WashBaySchema,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const dbData = transformWashBaySchemaToDbData(washBay);

  const [id] = await txOrDb
    .update(washBays)
    .set(dbData)
    .where(
      and(eq(washBays.id, washBayId), eq(washBays.configuration_id, confId)),
    )
    .returning({ id: washBays.id });

  return { success: true, id };
};

export const deleteWashBay = async (
  confId: number,
  washBayId: number,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const [id] = await txOrDb
    .delete(washBays)
    .where(
      and(eq(washBays.id, washBayId), eq(washBays.configuration_id, confId)),
    )
    .returning({ id: washBays.id });

  return {
    success: true,
    id,
  };
};

export async function getBOM(id: number, user: NonNullable<UserData>) {
  const configuration = await getConfigurationWithTanksAndBays(id, user);
  if (configuration) {
    const bom = BOM.init(configuration);
    return bom;
  }
}

export async function getPartNumbersByArray(array: string[]) {
  const response = await db.query.partNumbers.findMany({
    where: inArray(partNumbers.pn, array),
  });
  return response;
}

// --- Engineering BOM ---

export async function getEngineeringBomItems(confId: number) {
  return db
    .select({
      id: engineeringBomItems.id,
      configuration_id: engineeringBomItems.configuration_id,
      category: engineeringBomItems.category,
      category_index: engineeringBomItems.category_index,
      pn: engineeringBomItems.pn,
      is_custom: engineeringBomItems.is_custom,
      description: engineeringBomItems.description,
      qty: engineeringBomItems.qty,
      original_qty: engineeringBomItems.original_qty,
      is_deleted: engineeringBomItems.is_deleted,
      is_added: engineeringBomItems.is_added,
      sort_order: engineeringBomItems.sort_order,
      tag: engineeringBomItems.tag,
      bom_rules_version: engineeringBomItems.bom_rules_version,
      created_at: engineeringBomItems.created_at,
      updated_at: engineeringBomItems.updated_at,
      pn_type: partNumbers.pn_type,
      is_phantom: partNumbers.is_phantom,
    })
    .from(engineeringBomItems)
    .leftJoin(partNumbers, eq(engineeringBomItems.pn, partNumbers.pn))
    .where(eq(engineeringBomItems.configuration_id, confId))
    .orderBy(
      asc(engineeringBomItems.category),
      asc(engineeringBomItems.category_index),
      asc(engineeringBomItems.sort_order),
    );
}

export type EngineeringBomItemWithPart = Awaited<
  ReturnType<typeof getEngineeringBomItems>
>[number];

/**
 * Batch variant of `getEngineeringBomItems` for margin math across many configs
 * (one query instead of one per line). Lean select — only the fields cost
 * computation needs — with no ordering, since the rows are aggregated, not
 * displayed. Configs without an EBOM simply contribute no rows.
 */
export async function getEngineeringBomItemsForConfigs(confIds: number[]) {
  if (confIds.length === 0) return [];
  return db
    .select({
      configuration_id: engineeringBomItems.configuration_id,
      pn: engineeringBomItems.pn,
      description: engineeringBomItems.description,
      qty: engineeringBomItems.qty,
      tag: engineeringBomItems.tag,
      is_deleted: engineeringBomItems.is_deleted,
    })
    .from(engineeringBomItems)
    .where(inArray(engineeringBomItems.configuration_id, confIds));
}

export async function getAssemblyChildren(parentPn: string) {
  const rows = await db.query.bomLines.findMany({
    where: eq(bomLines.parent_pn, parentPn),
    orderBy: [asc(bomLines.sort_order)],
    with: {
      child: {
        columns: {
          pn: true,
          description: true,
          pn_type: true,
          is_phantom: true,
          is_subcontract: true,
        },
      },
    },
  });

  return rows.flatMap((r) => {
    if (!r.child) return [];
    return [
      {
        pn: r.child.pn,
        description: r.child.description,
        qty: Number(r.qty),
        sort_order: r.sort_order,
        pn_type: r.child.pn_type,
        is_phantom: r.child.is_phantom,
        is_subcontract: r.child.is_subcontract,
      },
    ];
  });
}

export type AssemblyChild = Awaited<
  ReturnType<typeof getAssemblyChildren>
>[number];

export async function hasEngineeringBom(
  confId: number,
  txOrDb: DatabaseType | TransactionType = db,
) {
  const row = await txOrDb.query.engineeringBomItems.findFirst({
    where: eq(engineeringBomItems.configuration_id, confId),
    columns: { id: true },
  });
  return row !== undefined;
}

export async function insertEngineeringBomItems(
  items: NewEngineeringBomItem[],
  txOrDb: DatabaseType | TransactionType = db,
) {
  if (items.length === 0) return;
  await txOrDb.insert(engineeringBomItems).values(items);
}

/**
 * Hard-deletes all engineering BOM items for a configuration.
 * Used during BOM regeneration (full wipe + reinsert).
 *
 * Individual item removal uses soft delete (is_deleted toggle) so the UI
 * can display removed items with visual distinction and allow restoration.
 */
export async function deleteAllEngineeringBomItems(
  confId: number,
  txOrDb: DatabaseType | TransactionType = db,
) {
  await txOrDb
    .delete(engineeringBomItems)
    .where(eq(engineeringBomItems.configuration_id, confId));
}

export async function resetWashBayEnergyChainFields(
  configurationId: number,
  txOrDb: DatabaseType | TransactionType = db,
) {
  await txOrDb
    .update(washBays)
    .set({
      energy_chain_width: null,
      has_shelf_extension: false,
      ec_signal_cable_qty: null,
      ec_profinet_cable_qty: null,
      ec_water_1_tube_qty: null,
      ec_water_34_tube_qty: null,
      ec_r1_1_tube_qty: null,
      ec_r2_1_tube_qty: null,
      ec_r2_34_inox_tube_qty: null,
      ec_air_tube_qty: null,
    })
    .where(eq(washBays.configuration_id, configurationId));
}

export async function resetWashBayNonEnergyChainFields(
  configurationId: number,
  txOrDb: DatabaseType | TransactionType = db,
) {
  await txOrDb
    .update(washBays)
    .set({
      hp_lance_qty: 0,
      det_lance_qty: 0,
      pressure_washer_type: null,
      pressure_washer_qty: null,
      is_first_bay: false,
      has_bay_dividers: false,
      has_weeping_lances: false,
      hose_reel_hp_with_post_qty: 0,
      hose_reel_hp_without_post_qty: 0,
      hose_reel_det_with_post_qty: 0,
      hose_reel_det_without_post_qty: 0,
      hose_reel_hp_det_with_post_qty: 0,
    })
    .where(eq(washBays.configuration_id, configurationId));
}

export async function getConfigurationStatusCounts() {
  const user = await getUserData();
  if (!user) return null;

  const whereClause = configScopeWhere(user);

  const result = await db
    .select({
      status: configurations.status,
      count: sql<number>`count(*)::int`,
    })
    .from(configurations)
    .where(whereClause)
    .groupBy(configurations.status);

  return result;
}

export type UserWithStats = {
  id: string;
  email: string;
  role: Role;
  initials: string | null;
  manager_id: string | null;
  last_login_at: Date | null;
  configCount: number;
  lastActivity: Date | null;
};

export async function getAllUsersWithStats(): Promise<UserWithStats[]> {
  const result = await db
    .select({
      id: userProfiles.id,
      email: userProfiles.email,
      role: userProfiles.role,
      initials: userProfiles.initials,
      manager_id: userProfiles.manager_id,
      last_login_at: userProfiles.last_login_at,
      configCount: countDistinct(configurations.id),
      lastActivity: max(activityLogs.created_at),
    })
    .from(userProfiles)
    .leftJoin(configurations, eq(configurations.user_id, userProfiles.id))
    .leftJoin(activityLogs, eq(activityLogs.user_id, userProfiles.id))
    .groupBy(
      userProfiles.id,
      userProfiles.email,
      userProfiles.role,
      userProfiles.initials,
      userProfiles.manager_id,
      userProfiles.last_login_at,
    )
    .orderBy(asc(userProfiles.email));

  return result.map((r) => ({
    ...r,
    configCount: Number(r.configCount),
    lastActivity: r.lastActivity ?? null,
  }));
}

export async function getUserProfileById(userId: string) {
  return db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, userId),
  });
}

export type ActivityLogEntry = typeof activityLogs.$inferSelect;

export async function getUserActivityLog(
  userId: string,
  page: number = 1,
  pageSize: number = 20,
) {
  const [data, countResult] = await Promise.all([
    db.query.activityLogs.findMany({
      where: eq(activityLogs.user_id, userId),
      orderBy: [desc(activityLogs.created_at)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(activityLogs)
      .where(eq(activityLogs.user_id, userId)),
  ]);

  return { data, totalCount: Number(countResult[0].count) };
}

type ActivityLogParams = {
  userId: string;
  action: ActivityAction;
  targetEntity: string;
  targetId: string;
  metadata?: Record<string, unknown>;
};

export async function insertActivityLog(
  params: ActivityLogParams,
  txOrDb: DatabaseType | TransactionType = db,
) {
  await txOrDb.insert(activityLogs).values({
    user_id: params.userId,
    action: params.action,
    target_entity: params.targetEntity,
    target_id: params.targetId,
    metadata: params.metadata ?? null,
  });
}

export async function logActivity(params: ActivityLogParams) {
  try {
    await insertActivityLog(params);
  } catch (err) {
    console.error("[logActivity] Failed to log activity:", err);
  }
}

export async function searchPartNumbers(query: string, limit = 20) {
  const pattern = query.includes("%") ? query : `%${query}%`;
  return db.query.partNumbers.findMany({
    where: or(
      ilike(partNumbers.pn, pattern),
      ilike(partNumbers.description, pattern),
    ),
    limit,
    orderBy: [asc(partNumbers.pn)],
  });
}

// ── Price coefficients ──────────────────────────────────────────────────────

export type PriceCoefficientWithUpdater = {
  id: number;
  pn: string;
  description: string | null;
  cost: string | null;
  coefficient: string;
  source: CoefficientSource;
  is_custom: boolean;
  updated_by: string | null;
  updaterEmail: string | null;
  updaterInitials: string | null;
  created_at: Date;
  updated_at: Date;
};

export async function getAllPriceCoefficients(): Promise<
  PriceCoefficientWithUpdater[]
> {
  return db
    .select({
      id: priceCoefficients.id,
      pn: priceCoefficients.pn,
      description: partNumbers.description,
      cost: partNumbers.cost,
      coefficient: priceCoefficients.coefficient,
      source: priceCoefficients.source,
      is_custom: priceCoefficients.is_custom,
      updated_by: priceCoefficients.updated_by,
      updaterEmail: userProfiles.email,
      updaterInitials: userProfiles.initials,
      created_at: priceCoefficients.created_at,
      updated_at: priceCoefficients.updated_at,
    })
    .from(priceCoefficients)
    .leftJoin(partNumbers, eq(priceCoefficients.pn, partNumbers.pn))
    .leftJoin(userProfiles, eq(priceCoefficients.updated_by, userProfiles.id))
    .orderBy(asc(priceCoefficients.pn));
}

export async function getPriceCoefficientsByArray(
  pns: string[],
): Promise<{ pn: string; coefficient: string }[]> {
  if (pns.length === 0) return [];
  return db
    .select({
      pn: priceCoefficients.pn,
      coefficient: priceCoefficients.coefficient,
    })
    .from(priceCoefficients)
    .where(inArray(priceCoefficients.pn, pns));
}

export async function getFullPriceCoefficientByPn(pn: string): Promise<
  | {
      pn: string;
      coefficient: string;
      source: CoefficientSource;
      is_custom: boolean;
    }
  | undefined
> {
  const [row] = await db
    .select({
      pn: priceCoefficients.pn,
      coefficient: priceCoefficients.coefficient,
      source: priceCoefficients.source,
      is_custom: priceCoefficients.is_custom,
    })
    .from(priceCoefficients)
    .where(eq(priceCoefficients.pn, pn));
  return row;
}

export async function createPriceCoefficient(data: {
  pn: string;
  coefficient: string;
  source: CoefficientSource;
  is_custom: boolean;
  updated_by: string | null;
}): Promise<{ id: number; pn: string }> {
  const [row] = await db
    .insert(priceCoefficients)
    .values(data)
    .returning({ id: priceCoefficients.id, pn: priceCoefficients.pn });
  return row;
}

export async function updatePriceCoefficientByPn(data: {
  pn: string;
  coefficient: string;
  is_custom: boolean;
  updated_by: string | null;
}): Promise<{ pn: string } | undefined> {
  const [row] = await db
    .update(priceCoefficients)
    .set({
      coefficient: data.coefficient,
      is_custom: data.is_custom,
      updated_by: data.updated_by,
      updated_at: new Date(),
    })
    .where(eq(priceCoefficients.pn, data.pn))
    .returning({ pn: priceCoefficients.pn });
  return row;
}

export async function deletePriceCoefficientByPn(
  pn: string,
): Promise<{ pn: string } | undefined> {
  const [row] = await db
    .delete(priceCoefficients)
    .where(eq(priceCoefficients.pn, pn))
    .returning({ pn: priceCoefficients.pn });
  return row;
}

export async function insertMissingMaxBomCoefficients(
  pns: string[],
  defaultCoefficient: string,
  txOrDb: DatabaseType | TransactionType = db,
): Promise<number> {
  if (pns.length === 0) return 0;
  const rows = await txOrDb
    .insert(priceCoefficients)
    .values(
      pns.map((pn) => ({
        pn,
        coefficient: defaultCoefficient,
        source: "MAXBOM" as const,
        is_custom: false,
      })),
    )
    .onConflictDoNothing({ target: priceCoefficients.pn })
    .returning({ pn: priceCoefficients.pn });
  return rows.length;
}

export async function createPriceCoefficientWithAudit(data: {
  pn: string;
  coefficient: string;
  source: CoefficientSource;
  is_custom: boolean;
  updated_by: string;
}): Promise<{ id: number; pn: string }> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(priceCoefficients)
      .values(data)
      .returning({ id: priceCoefficients.id, pn: priceCoefficients.pn });
    await insertActivityLog(
      {
        userId: data.updated_by,
        action: "COEFFICIENT_CREATE",
        targetEntity: "price_coefficient",
        targetId: data.pn,
        metadata: { old_value: null, new_value: data.coefficient },
      },
      tx,
    );
    return row;
  });
}

export async function updatePriceCoefficientByPnWithAudit(data: {
  pn: string;
  coefficient: string;
  updated_by: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ coefficient: priceCoefficients.coefficient })
      .from(priceCoefficients)
      .where(eq(priceCoefficients.pn, data.pn));

    if (!existing) throw new QueryError(MSG.coefficient.notFound, 404);

    await tx
      .update(priceCoefficients)
      .set({
        coefficient: data.coefficient,
        is_custom: true,
        updated_by: data.updated_by,
        updated_at: new Date(),
      })
      .where(eq(priceCoefficients.pn, data.pn));

    await insertActivityLog(
      {
        userId: data.updated_by,
        action: "COEFFICIENT_UPDATE",
        targetEntity: "price_coefficient",
        targetId: data.pn,
        metadata: {
          old_value: existing.coefficient,
          new_value: data.coefficient,
        },
      },
      tx,
    );
  });
}

export async function deletePriceCoefficientByPnWithAudit(data: {
  pn: string;
  updated_by: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ coefficient: priceCoefficients.coefficient })
      .from(priceCoefficients)
      .where(eq(priceCoefficients.pn, data.pn));

    if (!existing) throw new QueryError(MSG.coefficient.notFound, 404);

    await tx.delete(priceCoefficients).where(eq(priceCoefficients.pn, data.pn));

    await insertActivityLog(
      {
        userId: data.updated_by,
        action: "COEFFICIENT_DELETE",
        targetEntity: "price_coefficient",
        targetId: data.pn,
        metadata: { old_value: existing.coefficient },
      },
      tx,
    );
  });
}

export async function resetPriceCoefficientWithAudit(data: {
  pn: string;
  defaultCoefficient: string;
  updated_by: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ coefficient: priceCoefficients.coefficient })
      .from(priceCoefficients)
      .where(eq(priceCoefficients.pn, data.pn));

    if (!existing) throw new QueryError(MSG.coefficient.notFound, 404);

    await tx
      .update(priceCoefficients)
      .set({
        coefficient: data.defaultCoefficient,
        is_custom: false,
        updated_by: data.updated_by,
        updated_at: new Date(),
      })
      .where(eq(priceCoefficients.pn, data.pn));

    await insertActivityLog(
      {
        userId: data.updated_by,
        action: "COEFFICIENT_RESET",
        targetEntity: "price_coefficient",
        targetId: data.pn,
        metadata: {
          old_value: existing.coefficient,
          new_value: data.defaultCoefficient,
        },
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

export async function getSurchargeSettings(
  txOrDb: DatabaseType | TransactionType = db,
): Promise<SurchargeSetting[]> {
  return txOrDb.query.surchargeSettings.findMany({
    orderBy: asc(surchargeSettings.kind),
  });
}

export async function getSurchargeSettingByKind(
  kind: SurchargeKind,
): Promise<SurchargeSetting> {
  const row = await db.query.surchargeSettings.findFirst({
    where: eq(surchargeSettings.kind, kind),
  });
  if (!row) {
    throw new QueryError(MSG.surcharge.notFound, 404);
  }
  return row;
}

/**
 * Updates a surcharge price and writes the audit log in a single transaction.
 * Both writes succeed or both roll back — the audit entry cannot be silently
 * skipped even if the activity_action enum is stale on the DB side.
 */
export async function updateSurchargeSettingWithAudit(data: {
  kind: SurchargeKind;
  price: string;
  updated_by: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ price: surchargeSettings.price })
      .from(surchargeSettings)
      .where(eq(surchargeSettings.kind, data.kind));

    if (!existing) throw new QueryError(MSG.surcharge.notFound, 404);

    const [row] = await tx
      .update(surchargeSettings)
      .set({ price: data.price, updated_by: data.updated_by })
      .where(eq(surchargeSettings.kind, data.kind))
      .returning({ kind: surchargeSettings.kind });

    if (!row) throw new QueryError(MSG.surcharge.notFound, 404);

    await insertActivityLog(
      {
        userId: data.updated_by,
        action: "SURCHARGE_UPDATE",
        targetEntity: "surcharge_setting",
        targetId: data.kind,
        metadata: { old_value: existing.price, new_value: data.price },
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

export async function getInstallationItemSettings(): Promise<
  InstallationItemSetting[]
> {
  return db.query.installationItemSettings.findMany({
    orderBy: asc(installationItemSettings.kind),
  });
}

/**
 * Updates an installation item default price and writes the audit log in a
 * single transaction, mirroring updateSurchargeSettingWithAudit.
 */
export async function updateInstallationItemSettingWithAudit(data: {
  kind: InstallationItemKind;
  price: string;
  updated_by: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ price: installationItemSettings.price })
      .from(installationItemSettings)
      .where(eq(installationItemSettings.kind, data.kind));

    if (!existing) throw new QueryError(MSG.installation.notFound, 404);

    const [row] = await tx
      .update(installationItemSettings)
      .set({ price: data.price, updated_by: data.updated_by })
      .where(eq(installationItemSettings.kind, data.kind))
      .returning({ kind: installationItemSettings.kind });

    if (!row) throw new QueryError(MSG.installation.notFound, 404);

    await insertActivityLog(
      {
        userId: data.updated_by,
        action: "INSTALLATION_ITEM_UPDATE",
        targetEntity: "installation_item_setting",
        targetId: data.kind,
        metadata: { old_value: existing.price, new_value: data.price },
      },
      tx,
    );
  });
}

export async function changeUserRoleWithAudit(data: {
  userId: string;
  newRole: Role;
  changedBy: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [targetRow] = await tx
      .select({ id: userProfiles.id, role: userProfiles.role })
      .from(userProfiles)
      .where(eq(userProfiles.id, data.userId));

    if (!targetRow) throw new QueryError(MSG.users.notFound, 404);

    // Only SALES agents report to a manager; clear a stale manager_id when the
    // user moves to any other role.
    const managerPatch = data.newRole === "SALES" ? {} : { manager_id: null };
    await tx
      .update(userProfiles)
      .set({ role: data.newRole, ...managerPatch })
      .where(eq(userProfiles.id, data.userId));

    // When a user leaves the SALES_MANAGER role, detach their direct reports so
    // none remain pointing at a non-manager.
    if (
      targetRow.role === "SALES_MANAGER" &&
      data.newRole !== "SALES_MANAGER"
    ) {
      await tx
        .update(userProfiles)
        .set({ manager_id: null })
        .where(eq(userProfiles.manager_id, data.userId));
    }

    await insertActivityLog(
      {
        userId: data.changedBy,
        action: "ROLE_CHANGE",
        targetEntity: "user_profile",
        targetId: data.userId,
        metadata: { from_role: targetRow.role, to_role: data.newRole },
      },
      tx,
    );
  });
}

export async function assignManagerWithAudit(data: {
  userId: string;
  managerId: string | null;
  changedBy: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    // Re-read AND lock the target row inside the transaction. Selecting `role`
    // here (not just `manager_id`) and locking with `FOR UPDATE` closes the
    // TOCTOU window: a concurrent `changeUserRoleWithAudit` UPDATE on this row
    // blocks until we commit, so the role invariant validated below still holds
    // at the moment of the write.
    const [targetRow] = await tx
      .select({
        id: userProfiles.id,
        role: userProfiles.role,
        manager_id: userProfiles.manager_id,
      })
      .from(userProfiles)
      .where(eq(userProfiles.id, data.userId))
      .for("update");

    if (!targetRow) throw new QueryError(MSG.users.notFound, 404);

    // Only SALES agents report to a manager. Re-validate inside the locked
    // transaction so a manager_id can never land on a non-SALES profile and
    // leak that user's configs into a manager's scope.
    if (targetRow.role !== "SALES") {
      throw new QueryError(MSG.users.invalidManager, 400);
    }

    // The manager must still exist and be a SALES_MANAGER at write time; lock it
    // too so a concurrent demotion cannot interleave.
    if (data.managerId !== null) {
      const [managerRow] = await tx
        .select({ id: userProfiles.id, role: userProfiles.role })
        .from(userProfiles)
        .where(eq(userProfiles.id, data.managerId))
        .for("update");

      if (!managerRow || managerRow.role !== "SALES_MANAGER") {
        throw new QueryError(MSG.users.invalidManager, 400);
      }
    }

    await tx
      .update(userProfiles)
      .set({ manager_id: data.managerId })
      .where(eq(userProfiles.id, data.userId));

    await insertActivityLog(
      {
        userId: data.changedBy,
        action: "MANAGER_ASSIGN",
        targetEntity: "user_profile",
        targetId: data.userId,
        metadata: {
          from_manager: targetRow.manager_id,
          to_manager: data.managerId,
        },
      },
      tx,
    );
  });
}
