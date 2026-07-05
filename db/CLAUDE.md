# Database Conventions

- **Schema changes:** Use `drizzle-kit push` during development (not `drizzle-kit migrate`).
- **Naming:** snake_case for all columns. Use `pgEnum()` for every enum field.
- **RLS:** All tables must call `.enableRLS()` for Row Level Security.
- **RLS policy stance:** Non-user tables intentionally have no Supabase RLS policies unless explicitly needed for a Supabase client data path. The app does not access application data through the browser Supabase client; authorization lives in Server Actions and Drizzle query helpers. Keep non-user tables fail-closed for Supabase API roles unless a future feature adds direct Supabase client access, and document/add policies as part of that change.
- **Null mapping:** DB `null` ↔ Zod `undefined`. `db/transformations.ts` handles the bridge: `transformConfigToDbInsert/Update` (form → DB) and `transformDbNullToUndefined` (DB → form).
- **Domain errors:** `QueryError` class (`db/queries/errors.ts`) with `errorCode` (400, 403, 404, 500) for deterministic error handling vs generic DB errors.
- **Transactions:** Use `db.transaction(async (tx) => { ... })` for atomic multi-step operations (e.g., BOM regenerate: delete + insert). Use `tx` (not `db`) for all operations inside the callback.
- **Audit log helpers.** `insertActivityLog(params, tx)` is strict (throws on failure, accepts a transaction); `logActivity(params)` is best-effort (swallows errors). Strict mutations must use a `*WithAudit` helper (see `updateSurchargeSettingWithAudit` as the reference) or pass `tx` to existing helpers and call `insertActivityLog(..., tx)` from the action. Query helpers that may participate in a transaction should accept `txOrDb: DatabaseType | TransactionType = db`.
