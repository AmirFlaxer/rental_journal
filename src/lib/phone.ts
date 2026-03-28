/**
 * Format an Israeli phone number for display.
 * 10 digits (mobile): 0XX-XXX XXXX
 *  9 digits (landline): 0X-XXX XXXX
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (digits.length === 9) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)} ${digits.slice(5)}`;
  }
  // Return as-is for partial or unrecognized length
  return raw;
}

/** Strip a formatted phone to digits only */
export function stripPhone(formatted: string): string {
  return formatted.replace(/\D/g, "");
}
