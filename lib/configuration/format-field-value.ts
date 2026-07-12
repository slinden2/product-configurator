import type { SelectOption } from "@/types";

/**
 * Framework-agnostic value formatters for read-only display of configuration
 * fields. Pure string helpers (no React/DOM), so they are shared by the HTML
 * view and the @react-pdf export, keeping displayed values consistent.
 */

/** Placeholder shown for missing/empty values (matches the form's NOT_SELECTED_LABEL spirit). */
export const EMPTY_DISPLAY = "—";

/**
 * Deliberate asymmetry with the other formatters: a missing boolean renders
 * "No", not EMPTY_DISPLAY — an unset checkbox means the option is absent, so
 * the read-only view states it plainly (pinned by test).
 */
export const formatBoolean = (value: boolean | undefined | null): string =>
  value ? "Sì" : "No";

/** Resolve an enum/select value to its Italian label via the field's options. */
export const formatEnumValue = (
  value: string | number | undefined | null,
  options: SelectOption[],
): string => {
  if (value === undefined || value === null || value === "") {
    return EMPTY_DISPLAY;
  }
  const match = options.find(
    (option) => option.value.toString() === value.toString(),
  );
  return match ? match.label : value.toString();
};

export const formatNumber = (
  value: number | undefined | null,
  suffix?: string,
): string => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return EMPTY_DISPLAY;
  }
  return suffix ? `${value} ${suffix}` : value.toString();
};

export const formatText = (value: string | undefined | null): string => {
  if (value === undefined || value === null || value.trim() === "") {
    return EMPTY_DISPLAY;
  }
  return value;
};
