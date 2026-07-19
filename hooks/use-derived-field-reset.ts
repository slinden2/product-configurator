"use client";

import { useEffect, useRef } from "react";
import {
  type FieldPath,
  type FieldValues,
  type PathValue,
  useFormContext,
} from "react-hook-form";

/** One derived field to normalize and the value to force it to. */
export interface DerivedFieldReset<TFieldValues extends FieldValues> {
  name: FieldPath<TFieldValues>;
  // `unknown`: `name` varies per entry, so a single value type can't be
  // inferred here; the caller supplies a value matching that field's Zod type.
  value?: unknown;
}

/**
 * Sanctioned exception to forms.md rule 1 ("always use the declarative
 * `fieldsToReset*` props"). Use this hook — and only this hook — when the reset
 * trigger is a **multi-field condition** the per-field `fieldsToResetOnValue` /
 * `fieldsToResetOnUncheck` API cannot express (e.g. "reset only when BOTH
 * checkboxes are off"). Prefer the declarative props everywhere else.
 *
 * While `shouldReset` holds, every listed field is forced to its `value`.
 *
 * **Mount-normalization contract (deliberate).** The reset also runs on mount,
 * so a stored config whose derived field has drifted (e.g. `card_qty` still set
 * while both of its triggers are now unchecked) is corrected in form state
 * rather than letting a stale hidden value ride into the BOM. Every reset uses
 * `shouldDirty: true` so a subsequent correction registers as a real form change
 * (an unsaved edit the user must save), and `shouldValidate: true` so any error
 * tied to the now-reset field clears immediately.
 */
export function useDerivedFieldReset<TFieldValues extends FieldValues>(
  shouldReset: boolean,
  resets: Array<DerivedFieldReset<TFieldValues>>,
): void {
  const { setValue } = useFormContext<TFieldValues>();

  // Keep the latest resets in a ref so the effect can depend on `shouldReset`
  // alone — the array is re-created on every render.
  const resetsRef = useRef(resets);
  resetsRef.current = resets;

  useEffect(() => {
    if (!shouldReset) return;

    for (const { name, value } of resetsRef.current) {
      // Narrowed once here (see DerivedFieldReset): `name` varies per entry, so
      // a single value type cannot be inferred.
      setValue(
        name,
        value as PathValue<TFieldValues, FieldPath<TFieldValues>>,
        { shouldValidate: true, shouldDirty: true },
      );
    }
  }, [shouldReset, setValue]);
}
