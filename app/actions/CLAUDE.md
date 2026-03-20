# Server Action Standards

All actions in this directory MUST follow this rigid execution flow and return shape to ensure frontend compatibility and security.

## Return Type Shape
Actions must always return an object with this structure:
`{ success: boolean, error?: string, data?: any, id?: number | string }`
- Use `as const` for the `success` boolean.
- Error messages must be in **Italian**.

## Implementation Template (Strict Order)
1. **Validation:** `safeParse` the input immediately using the relevant Zod schema. This is valid for any action that needs to parse form data.
2. **Authentication:** Fetch `getUserData()`. Return `{ success: false, error: "Utente non trovato." }` if null.
3. **Existence & State:** Fetch the current record from the DB. Verify it exists.
4. **Permissions:** - Check Ownership/Role (Owner, INTERNAL, or ADMIN).
   - CALL `isEditable(status, role)` for all mutations (edit/delete/status change).
5. **Execution:** Wrap the `db` mutation in a `try/catch` block.
6. **Invalidation:** Call `revalidatePath` for all affected routes (e.g., list and detail pages).
7. **Error Handling:** Catch `QueryError` and `DatabaseError` **separately**:
   - `QueryError` → return `err.message` (controlled Italian messages from `db/queries.ts`)
   - `DatabaseError` → return `"Errore del database."` (never expose raw pg error strings)
   - Default → return `"Errore sconosciuto."`

## Error Message Registry (Standardized Italian)
- Auth: `Non autorizzato.`
- Not Found: `Record non trovato.` or `Configurazione non trovata.`
- Frozen State: `Non è possibile modificare una configurazione in questo stato.`
- BOM Auth: `Non autorizzato a modificare la distinta ingegneria.`
- Database Error: `Errore del database.`
- Default: `Errore sconosciuto.`

## BOM Cascade Invalidation
When a configuration is edited, the engineering BOM snapshot becomes stale. Any action that mutates configuration data must:
1. Check `hasEngineeringBom(confId)` after the mutation succeeds.
2. If true, call `deleteAllEngineeringBomItems(confId)` to invalidate the snapshot.
3. Revalidate the BOM page path: `revalidatePath(/configurations/bom/${confId})`.

This applies to `editConfigurationAction` and any new action that changes configuration fields used by BOM rules.

## Sub-Record Actions
`handleSubRecordAction` in `lib/sub-record-actions.ts` is a generic handler for insert/edit/delete on sub-records (water tanks, wash bays). It uses a discriminated union on `actionType` to enforce type-safe options per variant (each variant requires only its relevant fields: `schema`/`formData` for insert/edit, `recordId` for edit/delete). It follows the standard return-based error pattern — returns `{ success: false, error }` on failure, never throws.

## Transactions
Use `db.transaction(async (tx) => { ... })` when a mutation involves multiple dependent DB operations that must succeed or fail atomically. Example: BOM regenerate (delete all items + insert new items). Use `tx` (not `db`) for all operations inside the callback.

## Standard revalidatePath Targets
After mutations, invalidate all affected routes:
- `/configurations` — list page (status/name may have changed)
- `/configurations/edit/${confId}` — detail/edit page
- `/configurations/bom/${confId}` — BOM page (if config data or BOM changed)

## Shared Authorization Helpers
When multiple actions in one file share the same auth logic, extract it into a local helper (e.g., `authorizeEngineeringBomAction()` in `engineering-bom-actions.ts`). This avoids duplicating the validate → auth → permissions chain across every export.

## Data Flow & Frontend Sync
Server Actions are the only mutation path. The full loop is: **Input → Mutation (Server Action) → Database → Sync**.

- **Form Sync:** The UI must rely on the returned `data` from the Server Action to reset React Hook Form state. Do not manually patch form state after a mutation — always `form.reset(returnedData)`.
- **Frontend consumption:** `sonner` toast displays `error` on failure; form resets with returned `data` on success.
- **Conflict Resolution:** If a mutation fails due to `ConfigurationStatus` (e.g., attempt to edit a `LOCKED` record), the action must return a structured error for `sonner` to display.