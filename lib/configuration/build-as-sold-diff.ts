import { parseOrRaw } from "@/lib/parse-or-raw";
import { updateConfigSchema } from "@/validation/config-schema";
import type { OfferConfigSnapshot } from "@/validation/offer-config-snapshot-schema";
import { updateWashBaySchema } from "@/validation/wash-bay-schema";
import { updateWaterTankSchema } from "@/validation/water-tank-schema";
import {
  buildConfigViewModel,
  buildWashBayViewSection,
  buildWaterTankViewSection,
  type ViewRow,
  type ViewSection,
} from "./build-config-view-model";

/**
 * Structured diff between a line's at-acceptance as-sold snapshot and the
 * current engineering configuration, for the margin page. Both sides share the
 * form/Zod shape (`OfferConfigSnapshot`), so the diff runs on the read-only
 * view model: labels, formatters and conditional row visibility come from
 * `build-config-view-model` and can never drift from the view page or PDF.
 *
 * Rows are outer-joined by `ViewRow.key` (the schema field name) — never by
 * label, which is not unique (e.g. every HP pump's first outlet is "Uscita 1").
 * Values are compared as formatted strings on purpose: `undefined`/`null`/`""`
 * all collapse to the same empty display, and a conditional-visibility flip
 * (a field hidden on one side) surfaces naturally as an added/removed row.
 */

export type AsSoldDiffStatus = "changed" | "added" | "removed";

export interface AsSoldDiffRow {
  /** Schema field name — the stable join key. */
  key: string;
  /** Italian label from the shared field-label maps. */
  label: string;
  /** Formatted as-sold value; null when the row is absent as-sold (added). */
  asSoldValue: string | null;
  /** Formatted current value; null when the row is absent now (removed). */
  currentValue: string | null;
  status: AsSoldDiffStatus;
}

export interface AsSoldDiffSection {
  title: string;
  /** Only drifted rows — unchanged rows are dropped. */
  rows: AsSoldDiffRow[];
}

export interface AsSoldDiff {
  /** Only sections containing drift, in canonical view order. */
  sections: AsSoldDiffSection[];
  hasChanges: boolean;
}

/**
 * Lenient snapshot parser mirroring `loadValidatedConfiguration`'s
 * parse-or-raw policy: a snapshot predating a schema migration (stale enum
 * value, removed field) still diffs instead of crashing the page. Returns
 * null only for structurally unusable input (not the 3-part snapshot shape).
 */
export function parseAsSoldSnapshot(raw: unknown): OfferConfigSnapshot | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { configuration, waterTanks, washBays } = raw as Record<
    string,
    unknown
  >;
  if (typeof configuration !== "object" || configuration === null) return null;
  if (!Array.isArray(waterTanks) || !Array.isArray(washBays)) return null;

  return {
    configuration: parseOrRaw(updateConfigSchema, configuration),
    waterTanks: waterTanks.map((tank) =>
      parseOrRaw(updateWaterTankSchema, tank),
    ),
    washBays: washBays.map((bay) => parseOrRaw(updateWashBaySchema, bay)),
  };
}

export function buildAsSoldDiff(
  asSold: OfferConfigSnapshot,
  current: OfferConfigSnapshot,
): AsSoldDiff {
  const sections = [
    ...diffConfigSections(asSold, current),
    ...diffEntitySections(asSold.waterTanks, current.waterTanks, {
      buildAsSoldSection: (tank, index) =>
        buildWaterTankViewSection(tank, index),
      buildCurrentSection: (tank, index) =>
        buildWaterTankViewSection(tank, index),
      addedSuffix: "aggiunto",
      removedSuffix: "rimosso",
    }),
    ...diffEntitySections(asSold.washBays, current.washBays, {
      // Each side renders with its own supply_type, so a supply change that
      // toggles the energy-chain group surfaces as added/removed rows.
      buildAsSoldSection: (bay, index) =>
        buildWashBayViewSection(bay, index, asSold.configuration.supply_type),
      buildCurrentSection: (bay, index) =>
        buildWashBayViewSection(bay, index, current.configuration.supply_type),
      addedSuffix: "aggiunta",
      removedSuffix: "rimossa",
    }),
  ].filter((section) => section.rows.length > 0);

  return { sections, hasChanges: sections.length > 0 };
}

/**
 * `name` is the offer header's customer-name shadow on an OFFER config, and this diff
 * only ever runs on offer lines. Editing the header re-syncs the shadow, which would
 * otherwise surface here as engineering drift ("Nome: Vecchio → Nuovo") on the margin
 * sign-off page — a commercial rename is not a change to what was engineered.
 */
const DIFF_EXEMPT_CONFIG_KEYS = new Set(["name"]);

function diffConfigSections(
  asSold: OfferConfigSnapshot,
  current: OfferConfigSnapshot,
): AsSoldDiffSection[] {
  const asSoldByTitle = new Map(
    buildConfigViewModel(asSold.configuration).map((s) => [s.title, s]),
  );
  // Both sides produce the same static section list, so the current side's
  // order is the canonical order.
  return buildConfigViewModel(current.configuration).map((section) => ({
    title: section.title,
    rows: diffRows(
      flattenRows(asSoldByTitle.get(section.title)),
      flattenRows(section),
    ).filter((row) => !DIFF_EXEMPT_CONFIG_KEYS.has(row.key)),
  }));
}

interface EntitySectionDiffOptions<T> {
  buildAsSoldSection: (entity: T, index: number) => ViewSection;
  buildCurrentSection: (entity: T, index: number) => ViewSection;
  /** Italian suffix for an entity present only now, e.g. "aggiunto". */
  addedSuffix: string;
  /** Italian suffix for an entity present only as-sold, e.g. "rimosso". */
  removedSuffix: string;
}

function diffEntitySections<T extends { id?: unknown }>(
  asSold: T[],
  current: T[],
  options: EntitySectionDiffOptions<T>,
): AsSoldDiffSection[] {
  const { kept, removed } = pairEntities(asSold, current);
  return [
    ...kept.map((pair) => {
      const section = options.buildCurrentSection(
        pair.current.entity,
        pair.current.index + 1,
      );
      if (!pair.asSold) {
        return {
          title: `${section.title} (${options.addedSuffix})`,
          rows: flattenRows(section).map((row) => toDiffRow(row, "added")),
        };
      }
      const asSoldSection = options.buildAsSoldSection(
        pair.asSold.entity,
        pair.asSold.index + 1,
      );
      return {
        title: section.title,
        rows: diffRows(flattenRows(asSoldSection), flattenRows(section)),
      };
    }),
    ...removed.map((entry) => {
      const section = options.buildAsSoldSection(entry.entity, entry.index + 1);
      return {
        title: `${section.title} (${options.removedSuffix})`,
        rows: flattenRows(section).map((row) => toDiffRow(row, "removed")),
      };
    }),
  ];
}

interface EntityEntry<T> {
  entity: T;
  index: number;
}

interface PairedEntities<T> {
  /** Every current entity, with its as-sold counterpart when one exists. */
  kept: { asSold?: EntityEntry<T>; current: EntityEntry<T> }[];
  /** As-sold entities with no current counterpart. */
  removed: EntityEntry<T>[];
}

/**
 * Pairs sub-record entities by DB `id` (stable post-handoff), so an entity
 * removed from the middle never mispairs the index-titled sections that
 * follow it. Raw-fallback snapshots may lack usable ids — degrade to index
 * pairing in that case. Removed-only entities come back in their own list, so
 * consumers never handle a pair with a missing side.
 */
function pairEntities<T extends { id?: unknown }>(
  asSold: T[],
  current: T[],
): PairedEntities<T> {
  const hasUsableIds = (list: T[]) =>
    list.every((entity) => typeof entity.id === "number") &&
    new Set(list.map((entity) => entity.id)).size === list.length;

  if (hasUsableIds(asSold) && hasUsableIds(current)) {
    const asSoldById = new Map<unknown, EntityEntry<T>>(
      asSold.map((entity, index) => [entity.id, { entity, index }]),
    );
    const currentIds = new Set(current.map((entity) => entity.id));
    return {
      kept: current.map((entity, index) => ({
        asSold: asSoldById.get(entity.id),
        current: { entity, index },
      })),
      removed: asSold
        .map((entity, index) => ({ entity, index }))
        .filter((entry) => !currentIds.has(entry.entity.id)),
    };
  }

  return {
    kept: current.map((entity, index) => ({
      asSold:
        index < asSold.length ? { entity: asSold[index], index } : undefined,
      current: { entity, index },
    })),
    removed: asSold
      .map((entity, index) => ({ entity, index }))
      .slice(current.length),
  };
}

function flattenRows(section: ViewSection | undefined): ViewRow[] {
  return section?.groups.flatMap((group) => group.rows) ?? [];
}

function toDiffRow(row: ViewRow, status: "added" | "removed"): AsSoldDiffRow {
  return {
    key: row.key,
    label: row.label,
    asSoldValue: status === "removed" ? row.value : null,
    currentValue: status === "added" ? row.value : null,
    status,
  };
}

/** Outer-joins two row lists by key; equal-valued rows are dropped. */
function diffRows(
  asSoldRows: ViewRow[],
  currentRows: ViewRow[],
): AsSoldDiffRow[] {
  const asSoldByKey = new Map(asSoldRows.map((row) => [row.key, row]));
  const currentKeys = new Set(currentRows.map((row) => row.key));

  const rows: AsSoldDiffRow[] = [];
  for (const row of currentRows) {
    const asSoldRow = asSoldByKey.get(row.key);
    if (!asSoldRow) {
      rows.push(toDiffRow(row, "added"));
    } else if (asSoldRow.value !== row.value) {
      rows.push({
        key: row.key,
        label: row.label,
        asSoldValue: asSoldRow.value,
        currentValue: row.value,
        status: "changed",
      });
    }
  }
  for (const row of asSoldRows) {
    if (!currentKeys.has(row.key)) rows.push(toDiffRow(row, "removed"));
  }
  return rows;
}
