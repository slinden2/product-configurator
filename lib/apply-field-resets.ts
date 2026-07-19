import type {
  FieldPath,
  FieldValues,
  PathValue,
  UseFormSetValue,
} from "react-hook-form";

/**
 * One reset directive: a set of fields to reset and the value to reset them to.
 *
 * `resetToValue` is typed `unknown` on purpose. A single directive lists a
 * heterogeneous `fieldsToReset` array, so there is no one `PathValue` type that
 * fits every path — callers must supply a value matching their Zod schema. The
 * (single, documented) narrowing cast lives inside {@link applyFieldResets}
 * rather than being blind-cast at each field component.
 */
export interface FieldResetConfig<TFieldValues extends FieldValues> {
  fieldsToReset: Array<FieldPath<TFieldValues>>;
  resetToValue?: unknown;
}

/**
 * Apply a batch of field-reset directives via react-hook-form's `setValue`.
 *
 * Shared by `SelectField` (`fieldsToResetOnValue`) and `CheckboxField`
 * (`fieldsToResetOnUncheck`) so the iterate-configs / iterate-fields / cast /
 * `setValue` block is written — and its `unknown → PathValue` cast documented —
 * exactly once. Each reset runs with `shouldValidate` and `shouldDirty` so the
 * dependent field revalidates and the form registers the change.
 */
export function applyFieldResets<TFieldValues extends FieldValues>(
  setValue: UseFormSetValue<TFieldValues>,
  configs: Array<FieldResetConfig<TFieldValues>>,
): void {
  configs.forEach((config) => {
    config.fieldsToReset.forEach((fieldToReset) => {
      // Narrowed once here (see FieldResetConfig): fieldsToReset is
      // heterogeneous, so a single resetToValue type cannot be inferred.
      const valueToSet = (config.resetToValue ?? undefined) as PathValue<
        TFieldValues,
        FieldPath<TFieldValues>
      >;

      setValue(fieldToReset, valueToSet, {
        shouldValidate: true,
        shouldDirty: true,
      });
    });
  });
}
