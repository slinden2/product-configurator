import { count, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db } from "@/db";

/**
 * Runs a paginated list query alongside its total-count query (in parallel) and
 * returns them in the shared `{ data, totalCount }` shape used by every list
 * endpoint. The count uses Drizzle's `count()` aggregate, typed `SQL<number>`,
 * so callers no longer hand-write ``sql`count(*)` `` or wrap the pg bigint in
 * `Number(...)`.
 *
 * `dataQuery` is the already-built `findMany`/`select` promise (carrying its own
 * LIMIT/OFFSET/ordering); `countTable` + `where` must mirror that query's filter
 * so the total reflects the same rows.
 */
export async function paginatedList<T>(
  dataQuery: Promise<T[]>,
  countTable: PgTable,
  where?: SQL,
): Promise<{ data: T[]; totalCount: number }> {
  const [data, countRows] = await Promise.all([
    dataQuery,
    db.select({ count: count() }).from(countTable).where(where),
  ]);

  return { data, totalCount: countRows[0].count };
}
