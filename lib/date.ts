const TIMEZONE = "America/Toronto";

/**
 * Returns today's date as a YYYY-MM-DD string in the America/Toronto timezone.
 */
export function getTodayLocal(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

/**
 * Returns the current YYYY-MM in America/Toronto timezone.
 */
export function getCurrentMonthLocal(): string {
  return getTodayLocal().slice(0, 7);
}

/**
 * Formats "YYYY-MM-DD" → "Friday, May 29, 2026"
 */
export function formatDisplayDateWithDay(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Formats "YYYY-MM-DD" → "May 29, 2026"
 */
export function formatDisplayDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Returns all YYYY-MM-DD strings for every day in the given "YYYY-MM" month.
 */
export function getDaysInMonth(yearMonth: string): string[] {
  const [year, month] = yearMonth.split("-").map(Number);
  const count = new Date(year, month, 0).getDate();
  return Array.from({ length: count }, (_, i) => {
    const d = String(i + 1).padStart(2, "0");
    const m = String(month).padStart(2, "0");
    return `${year}-${m}-${d}`;
  });
}

/**
 * Returns the 0-based weekday (Sun=0) of the first day of the given "YYYY-MM".
 */
export function getFirstDayOfWeek(yearMonth: string): number {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(year, month - 1, 1).getDay();
}

/**
 * Formats "YYYY-MM" → "May 2026"
 */
export function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}
