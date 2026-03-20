# Database Conventions

- **Schema changes:** Use `drizzle-kit push` during development (not `drizzle-kit migrate`).
- **Naming:** snake_case for all columns. Use `pgEnum()` for every enum field.
- **RLS:** All tables must call `.enableRLS()` for Row Level Security.
- **Null mapping:** DB `null` ↔ Zod `undefined`. `db/transformations.ts` handles the bridge: `transformConfigToDbInsert/Update` (form → DB) and `transformDbNullToUndefined` (DB → form).
- **Domain errors:** `QueryError` class (`db/queries.ts`) with `errorCode` (400, 403, 404, 500) for deterministic error handling vs generic DB errors.
- **Transactions:** Use `db.transaction(async (tx) => { ... })` for atomic multi-step operations (e.g., BOM regenerate: delete + insert). Use `tx` (not `db`) for all operations inside the callback.
