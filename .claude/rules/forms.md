# Form Implementation Rules

When editing any file in `components/config-form/` or using `SubRecordForm`:

1. **Dependency Logic:** - Never hardcode resets. Always use the `fieldsToReset` or `fieldsToResetOnValue` props.
   - If a new dependency is added, verify the key name exists in the associated Zod schema in `validation/`.

2. **Generic Components:** - `SubRecordForm` is the source of truth for wash bays and water tanks. Do not create custom CRUD forms for these entities.
   - When modifying `SubRecordForm`, ensure the `onSuccess` callback correctly calls `form.reset()` with the new data returned from the server.

3. **Field Components:**
   - `SelectField` and `CheckboxField` must remain "dumb" components—they should accept props and handle conversion, not perform business logic or data fetching.
   - Always map the internal `value` to the type expected by the Zod schema (e.g., string to number/boolean).

4. **Validation:**
   - Any form-level validation must be handled via the Zod resolver in the `useForm` hook, never via custom state checking inside the component.