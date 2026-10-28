/** Stored in text columns when a field is explicitly marked not applicable. */
export const OPTIONAL_FIELD_NA_VALUE = "—";

export function isOptionalDashInput(value: string) {
  const trimmed = value.trim();
  return trimmed === "-" || trimmed === "—" || trimmed === "–";
}

export function parseOptionalTextFieldInput(value: string): string | null {
  if (isOptionalDashInput(value)) return OPTIONAL_FIELD_NA_VALUE;
  const trimmed = value.trim();
  return trimmed || null;
}

/** Value for editable text inputs (empty when unset or N/A). */
export function formatOptionalTextFieldInputValue(
  value: string | null | undefined,
) {
  if (!value?.trim() || value === OPTIONAL_FIELD_NA_VALUE) return "";
  return value;
}

export function formatOptionalTextFieldDisplay(
  value: string | null | undefined,
) {
  if (!value?.trim() || value === OPTIONAL_FIELD_NA_VALUE) return "—";
  return value;
}

export function isOptionalTextFieldComplete(value: string | null | undefined) {
  return Boolean(value?.trim());
}
