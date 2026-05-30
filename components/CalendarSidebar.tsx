"use client";

import { useRouter } from "next/navigation";
import {
  getDaysInMonth,
  getFirstDayOfWeek,
  formatMonthLabel,
  getTodayLocal,
} from "@/lib/date";

interface Props {
  yearMonth: string;      // "YYYY-MM"
  entryDates: string[];   // YYYY-MM-DD strings that have entries
  selectedDate: string;   // currently viewed date
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarSidebar({ yearMonth, entryDates, selectedDate }: Props) {
  const router = useRouter();
  const today = getTodayLocal();
  const days = getDaysInMonth(yearMonth);
  const firstDow = getFirstDayOfWeek(yearMonth);
  const entrySet = new Set(entryDates);

  function handleDayClick(date: string) {
    if (date > today) return; // no future dates
    router.push(`/journal?date=${date}`);
  }

  // Navigate between months
  function changeMonth(delta: number) {
    const [y, m] = yearMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    // Keep selected date or fall back to first of month
    router.push(`/journal?date=${next}-01`);
  }

  const currentMonth = today.slice(0, 7);
  const canGoNext = yearMonth < currentMonth;

  return (
    <aside className="w-72 flex-shrink-0">
      <div className="bg-white rounded-2xl shadow-sm p-4">
        {/* Month header */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => changeMonth(-1)}
            className="p-1 rounded hover:bg-amber-50 text-amber-700 transition"
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
            className="p-1 rounded hover:bg-amber-50 text-amber-700 transition disabled:opacity-30"
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
          {/* Leading blank cells */}
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
              "relative flex items-center justify-center h-8 w-8 mx-auto rounded-full text-sm transition ";

            if (isSelected) {
              cellClass += "bg-amber-500 text-white font-bold ";
            } else if (isToday) {
              cellClass += "border-2 border-amber-400 text-amber-700 font-semibold ";
            } else if (isFuture) {
              cellClass += "text-gray-300 cursor-default ";
            } else {
              cellClass += "text-gray-700 hover:bg-amber-50 cursor-pointer ";
            }

            return (
              <button
                key={date}
                onClick={() => handleDayClick(date)}
                disabled={isFuture}
                className={cellClass}
                aria-label={date}
                title={hasEntry ? "Entry exists" : undefined}
              >
                {dayNum}
                {/* Dot indicator for entries */}
                {hasEntry && !isSelected && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400" /> Entry written
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 rounded-full bg-amber-500" />
            <span className="text-white text-[9px] font-bold -ml-3 pl-1">·</span> Selected
          </span>
        </div>
      </div>
    </aside>
  );
}
