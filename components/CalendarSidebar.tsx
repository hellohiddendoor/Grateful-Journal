"use client";

import { useRouter } from "next/navigation";
import {
  getDaysInMonth,
  getFirstDayOfWeek,
  formatMonthLabel,
  getTodayLocal,
} from "@/lib/date";

interface Props {
  yearMonth: string;     // "YYYY-MM" — the calendar month being displayed
  entryDates: string[];  // YYYY-MM-DD strings that have entries (for this month)
  selectedDate: string;  // the entry date currently being viewed
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarSidebar({ yearMonth, entryDates, selectedDate }: Props) {
  const router = useRouter();
  const today = getTodayLocal();
  const days = getDaysInMonth(yearMonth);
  const firstDow = getFirstDayOfWeek(yearMonth);
  const entrySet = new Set(entryDates);
  const currentMonth = today.slice(0, 7);

  // Click a calendar day → view that date's entry, keep calendar on same month
  function handleDayClick(date: string) {
    if (date > today) return;
    router.push(`/journal?date=${date}&month=${yearMonth}`);
  }

  // Navigate calendar month → keep the currently-selected entry visible
  function changeMonth(delta: number) {
    const [y, m] = yearMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const nextMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    // Keep selectedDate unchanged; only move the calendar view
    router.push(`/journal?date=${selectedDate}&month=${nextMonth}`);
  }

  const canGoNext = yearMonth < currentMonth;

  return (
    <aside className="w-72 flex-shrink-0">
      <div className="bg-white rounded-2xl shadow-sm p-4">
        {/* Month header */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => changeMonth(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-amber-50 text-amber-700 text-xl font-bold transition"
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="font-semibold text-gray-800 text-sm">
            {formatMonthLabel(yearMonth)}
          </span>
          <button
            onClick={() => changeMonth(1)}
            disabled={!canGoNext}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-amber-50 text-amber-700 text-xl font-bold transition disabled:opacity-30 disabled:cursor-default"
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        {/* Day-of-week labels */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {/* Leading blank cells for correct day alignment */}
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}

          {days.map((date) => {
            const dayNum = Number(date.split("-")[2]);
            const isToday = date === today;
            const isSelected = date === selectedDate;
            const hasEntry = entrySet.has(date);
            const isFuture = date > today;

            let cellClass =
              "relative flex items-center justify-center h-8 w-8 mx-auto rounded-full text-sm select-none ";

            if (isSelected) {
              cellClass += "bg-amber-500 text-white font-bold shadow-sm ";
            } else if (isToday) {
              cellClass += "border-2 border-amber-400 text-amber-700 font-semibold ";
            } else if (isFuture) {
              cellClass += "text-gray-300 cursor-default ";
            } else {
              cellClass += "text-gray-700 hover:bg-amber-50 cursor-pointer transition ";
            }

            return (
              <button
                key={date}
                type="button"
                onClick={() => handleDayClick(date)}
                disabled={isFuture}
                className={cellClass}
                aria-label={`${date}${hasEntry ? " — entry written" : ""}`}
                aria-pressed={isSelected}
              >
                {dayNum}
                {/* Entry dot — hidden when selected (bg color makes it invisible anyway) */}
                {hasEntry && !isSelected && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
                {/* White dot on selected day that has entry */}
                {hasEntry && isSelected && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white opacity-80" />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
            Entry written
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-4 rounded-full bg-amber-500 flex-shrink-0" />
            Selected
          </span>
        </div>
      </div>
    </aside>
  );
}
