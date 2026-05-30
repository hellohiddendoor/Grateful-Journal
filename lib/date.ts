const TIMEZONE = "America/Toronto";

/**
 * Returns today's date as a YYYY-MM-DD string in the America/Toronto timezone.
 * Used for entry_date comparisons and display throughout the app.
 */
export function getTodayLocal(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE });
  // en-CA locale formats as YYYY-MM-DD natively — matches Supabase date columns.
}

/**
 * Formats a YYYY-MM-DD date string for display (e.g. "May 29, 2026").
 */
export function formatDisplayDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
