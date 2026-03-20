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
7. **Error Handling:** Catch `QueryError` or `DatabaseError` specifically; otherwise, return `error: "Errore sconosciuto."`

## Error Message Registry (Standardized Italian)
- Auth: `Non autorizzato.`
- Not Found: `Record non trovato.` or `Configurazione non trovata.`
- Frozen State: `Non è possibile modificare una configurazione in questo stato.`
- Default: `Si è verificato un errore imprevisto.`