import { getEngineeringBomItemsForConfigs } from "@/db/queries";
import { enrichWithCosts } from "@/lib/BOM";
import {
  computeEbomCost,
  computeMargin,
  type EbomCostItem,
  getConfigurationProductCategory,
  getMarginThresholdForCategory,
  isMarginAlertActive,
} from "@/lib/margin";
import { prepareOfferDisplayData } from "@/lib/offer";

export interface LineMarginAlert {
  lineId: number;
  configurationId: number;
  /**
   * Live gross margin percentage of the current EBOM vs the as-sold revenue.
   * ⚠ Meaningless when `hasEbom` is false: with no engineering BOM the cost is
   * treated as 0, so this reads a phantom 100% (the same reason
   * `buildMarginComparison` forces a 0 placeholder). Callers MUST branch on
   * `hasEbom` — never present this number for a line without an EBOM. Use
   * {@link classifyMarginLineState} rather than reading this directly.
   */
  marginPct: number;
  thresholdPct: number;
  /**
   * True when the alert is raised: margin below threshold AND not covered by
   * an absorb sign-off (an absorbed line re-alerts only when the live margin
   * drops below the absorbed margin).
   */
  alertActive: boolean;
  /**
   * Whether the line's configuration has a non-deleted engineering BOM. When
   * false the margin is not yet computable and the line is "margin unavailable"
   * — never a healthy margin.
   */
  hasEbom: boolean;
  /**
   * The margin percentage recorded by a prior absorb sign-off (the re-alert
   * baseline), or null when the line has never been absorbed.
   */
  absorbedMarginPct: number | null;
}

/**
 * Explicit per-line margin state for the offer-level margin hub, distinguishing
 * the cases the raw `marginPct`/`alertActive` pair cannot on its own:
 * - `MARGIN_UNAVAILABLE` — no snapshot and/or no EBOM (never a 100% margin).
 * - `BELOW_THRESHOLD` — under threshold, no absorb sign-off: decision required.
 * - `ABSORBED_ERODED` — absorbed before, but the live margin dropped below the
 *   absorbed baseline again: decision required.
 * - `ABSORBED` — an absorb sign-off is on record and currently covers the line.
 * - `ABOVE_THRESHOLD` — margin at or above threshold, no decision needed.
 */
export type MarginLineState =
  | "ABOVE_THRESHOLD"
  | "BELOW_THRESHOLD"
  | "ABSORBED"
  | "ABSORBED_ERODED"
  | "MARGIN_UNAVAILABLE";

/**
 * Classifies a line's margin state from its alert. `undefined` (the line was
 * skipped — no snapshot) and a line with no EBOM both resolve to
 * `MARGIN_UNAVAILABLE`, so the hub never presents a phantom 100% as healthy.
 * A recorded absorb sign-off keeps a line in the `ABSORBED*` family even if the
 * live margin has since recovered above threshold — the decision stays on record.
 */
export function classifyMarginLineState(
  alert: LineMarginAlert | undefined,
): MarginLineState {
  if (!alert?.hasEbom) return "MARGIN_UNAVAILABLE";
  const absorbed = alert.absorbedMarginPct !== null;
  if (alert.alertActive)
    return absorbed ? "ABSORBED_ERODED" : "BELOW_THRESHOLD";
  return absorbed ? "ABSORBED" : "ABOVE_THRESHOLD";
}

/** True when any of the given line alerts is currently raised. */
export function hasActiveMarginAlert(
  alerts: Iterable<LineMarginAlert>,
): boolean {
  for (const alert of alerts) {
    if (alert.alertActive) return true;
  }
  return false;
}

type AlertInputLine = {
  id: number;
  configuration_id: number;
  pricing_snapshot: unknown;
  as_sold_frozen_at: Date | null;
  absorbed_margin_percent: string | null;
};

/**
 * Line eligibility for margin computation: a pricing snapshot is mandatory;
 * the as-sold freeze is additionally required in frozen mode. The single
 * definition shared by both entry points, so the dashboard sweep and the
 * per-offer margin page can never disagree on which lines have alerts.
 */
const isEligibleAlertLine = (
  line: AlertInputLine,
  requireFrozen: boolean,
): boolean =>
  line.pricing_snapshot !== null &&
  (!requireFrozen || line.as_sold_frozen_at !== null);

/**
 * Pure margin computation over pre-filtered eligible lines and a pre-fetched,
 * cost-enriched EBOM map. Eligibility filtering and the EBOM fetch live in the
 * exported entry points ({@link computeLineMarginAlertsBatch}).
 */
function computeAlertsFromEnrichedEbom(
  eligibleLines: AlertInputLine[],
  discountPct: number,
  ebomByConfig: Map<number, EbomCostItem[]>,
): Map<number, LineMarginAlert> {
  const alerts = new Map<number, LineMarginAlert>();

  for (const line of eligibleLines) {
    const { displayData } = prepareOfferDisplayData(
      line.pricing_snapshot,
      discountPct,
    );
    if (!displayData) continue;

    const revenue = displayData.discounted_total;
    const ebomItems = ebomByConfig.get(line.configuration_id) ?? [];
    const thresholdPct = getMarginThresholdForCategory(
      getConfigurationProductCategory(),
    );
    // The batch fetch keeps soft-deleted rows, so "has an EBOM" must exclude
    // them — otherwise an all-deleted BOM would read as a healthy margin.
    const hasEbom = ebomItems.some((item) => !item.is_deleted);
    const absorbedMarginPct =
      line.absorbed_margin_percent === null
        ? null
        : Number(line.absorbed_margin_percent);

    alerts.set(line.id, {
      lineId: line.id,
      configurationId: line.configuration_id,
      marginPct: computeMargin(revenue, computeEbomCost(ebomItems)).marginPct,
      thresholdPct,
      alertActive: isMarginAlertActive(
        revenue,
        ebomItems,
        thresholdPct,
        absorbedMarginPct,
      ),
      hasEbom,
      absorbedMarginPct,
    });
  }

  return alerts;
}

async function fetchEbomByConfig(
  configIds: number[],
): Promise<Map<number, EbomCostItem[]>> {
  const ebomRows = await getEngineeringBomItemsForConfigs(configIds);
  const enriched = await enrichWithCosts(ebomRows);

  const ebomByConfig = new Map<number, EbomCostItem[]>();
  for (const row of enriched) {
    const items = ebomByConfig.get(row.configuration_id) ?? [];
    items.push({
      pn: row.pn,
      description: row.description,
      qty: row.qty,
      cost: row.cost,
      tag: row.tag,
      is_deleted: row.is_deleted,
    });
    ebomByConfig.set(row.configuration_id, items);
  }
  return ebomByConfig;
}

/**
 * Live per-line margin alerts across many revisions, each with its own
 * discount. Revenue is the per-unit discounted offer total from the line's
 * `pricing_snapshot` (quantity intentionally ignored) and cost is the current
 * EBOM at today's catalog cost — the same semantics as the margin review page,
 * so the offer badge and that page can never disagree. The threshold is picked
 * automatically from the line configuration's product category.
 *
 * Two modes, controlled by `requireFrozen` (default `true`):
 * - **Accepted (frozen), the default** — only lines with an as-sold freeze
 *   (`as_sold_frozen_at !== null`) are considered. This is the in-force margin
 *   baseline: the customer's quoted price frozen at acceptance vs live cost.
 * - **Projected (`requireFrozen: false`)** — the working (renegotiation)
 *   revision's DRAFT lines, which are not frozen. Revenue comes from each line's
 *   live `pricing_snapshot` + the *working* revision's discount, so the margin
 *   tracks the discount the director is currently tuning. Draft lines carry no
 *   absorb sign-off, so `absorbedMarginPct` is null and the alert reduces to the
 *   raw below-threshold fact.
 *
 * Lines without a snapshot are always skipped (no map entry). A considered line
 * whose config has no non-deleted EBOM gets an entry with `hasEbom: false` and
 * no active alert — "margin unavailable", not a healthy 100% (see
 * {@link classifyMarginLineState}). Costs are fetched in one batch query plus a
 * single part-number lookup regardless of group or line count.
 */
export async function computeLineMarginAlertsBatch(
  groups: { lines: AlertInputLine[]; discountPct: number }[],
  options: { requireFrozen?: boolean } = {},
): Promise<Map<number, LineMarginAlert>> {
  const { requireFrozen = true } = options;
  const eligibleGroups = groups
    .map((group) => ({
      discountPct: group.discountPct,
      lines: group.lines.filter((line) =>
        isEligibleAlertLine(line, requireFrozen),
      ),
    }))
    .filter((group) => group.lines.length > 0);
  const allEligible = eligibleGroups.flatMap((group) => group.lines);
  if (allEligible.length === 0) return new Map();

  const ebomByConfig = await fetchEbomByConfig(
    allEligible.map((line) => line.configuration_id),
  );

  const merged = new Map<number, LineMarginAlert>();
  for (const group of eligibleGroups) {
    const alerts = computeAlertsFromEnrichedEbom(
      group.lines,
      group.discountPct,
      ebomByConfig,
    );
    for (const [id, alert] of alerts) {
      merged.set(id, alert);
    }
  }

  return merged;
}

/**
 * Single-revision convenience wrapper over
 * {@link computeLineMarginAlertsBatch} — see it for the full contract (modes,
 * eligibility, EBOM semantics).
 */
export async function computeLineMarginAlerts(
  lines: AlertInputLine[],
  discountPct: number,
  options: { requireFrozen?: boolean } = {},
): Promise<Map<number, LineMarginAlert>> {
  return computeLineMarginAlertsBatch([{ lines, discountPct }], options);
}
