/**
 * Client-safe filename helper for the offer exports. Kept separate from
 * `lib/offer-export.ts` (which transitively imports the server-only `lib/offer`
 * → `db/queries`) so the client export buttons can use it without dragging the
 * server chain into the browser bundle.
 *
 * Stem format: `Offerta_{offer_number}_Rev{revision_no}_{YYYY-MM-DD}`.
 */
export function offerExportFilenameStem(
  offer: { offerNumber: string; revisionNo: number },
  isoDate: string,
): string {
  return `Offerta_${offer.offerNumber}_Rev${offer.revisionNo}_${isoDate}`;
}

/** YYYY-MM-DD in the user's local timezone (toISOString would shift to UTC). */
export function localIsoDate(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
