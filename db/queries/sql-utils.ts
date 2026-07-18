/**
 * Decode a timestamp produced by a raw `sql` fragment or `db.execute`, which
 * bypass drizzle's schema-based column mapping. The `timestamp` columns store
 * UTC wall time without a zone marker, so the driver hands back a bare string
 * ("2026-07-17 08:15:30.123") that `new Date(...)` would parse as **local**
 * time. Mirror drizzle's own column decode by pinning the string to UTC.
 */
export function parseDbTimestamp(value: string | Date | null): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  return new Date(`${value}+0000`);
}
