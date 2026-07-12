import type { z } from "zod";

/**
 * Parses `raw` with `schema`, falling back to the raw value (cast to the schema
 * type) when validation fails. This makes the fallback policy explicit and
 * single-source: stale enum values / removed fields (e.g. a snapshot predating
 * a schema migration) are surfaced as-is rather than crashing the page — the
 * edit form flags invalid data in red on mount; read-only views simply render
 * the raw value.
 */
export function parseOrRaw<T>(schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  return result.success ? result.data : (raw as T);
}
