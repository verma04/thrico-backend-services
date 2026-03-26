/**
 * Safely formats a date string for database input.
 * Returns null if the input is falsy, an empty string, or an invalid date.
 * Otherwise returns the date in ISO string format.
 */
export const formatDateInput = (
  dateStr: string | null | undefined,
): string | undefined => {
  if (!dateStr || (typeof dateStr === "string" && dateStr.trim() === "")) {
    return undefined;
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
};
