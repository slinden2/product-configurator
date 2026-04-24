# BOM Domain

The system has two BOM modes:

- **Real-time calculated BOM:** Generated on-the-fly from rule files. `BOM` class (singleton via `BOM.init(config)`) calls `buildCompleteBOM()` → `{ generalBOM, waterTankBOMs, washBayBOMs }`.
- **Engineering BOM snapshot:** Frozen copy stored in `engineering_bom_items` table for engineers to review and modify.

## Rule Composition

Files under `lib/BOM/max-bom/` (gantry, brush, dosing pump, water supply, nozzle bar, supply, rail, electric, fast, HP pump) compose into `GeneralMaxBOM`, `WaterTankMaxBOM`, `WashBayMaxBOM`. Each rule item has `pn`, `conditions` (filter functions), `qty` (static or dynamic), and `_description`.

## Engineering BOM Lifecycle

1. **Snapshot** — creates initial frozen BOM from calculated rules (`snapshotEngineeringBomAction`)
2. **Edit** — engineers add/delete/modify items; tracks changes via `is_added`, `is_deleted`, `is_custom`, `original_qty` flags
3. **Regenerate** — atomically replaces all items with fresh calculation (transaction-based)
4. **Invalidation** — any configuration edit deletes the engineering BOM (cascade in `editConfigurationAction`)

## BOM Rules Version

**`BOM_RULES_VERSION`** (`lib/BOM/max-bom/index.ts`): Must be bumped every time any rule file under `lib/BOM/max-bom/` is modified. Format: `YYMMDD`. This version is stored on engineering BOM snapshots (`bom_rules_version` column) so engineers can identify which rule set produced the BOM and whether it is outdated.
