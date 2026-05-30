import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import JournalEditor from "@/components/JournalEditor";
import CalendarSidebar from "@/components/CalendarSidebar";
import { getTodayLocal, getCurrentMonthLocal } from "@/lib/date";
import type { Entry, Profile } from "@/types/database";

// Always fetch fresh — never serve a cached version with stale entry data
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ date?: string; month?: string }>;
}

export default async function JournalPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: profile } = (await db
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single()) as { data: Profile | null; error: unknown };

  const today = getTodayLocal();
  const params = await searchParams;

  // Selected entry date — clamp to today if in the future or missing
  const selectedDate =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) && params.date <= today
      ? params.date
      : today;

  const isToday = selectedDate === today;

  // Calendar display month — can be different from the selected entry's month
  const yearMonth =
    params.month && /^\d{4}-\d{2}$/.test(params.month)
      ? params.month
      : selectedDate.slice(0, 7) || getCurrentMonthLocal();

  // ── Fetch the entry for the selected date ──────────────────────────────────
  const { data: selectedEntry } = (await db
    .from("entries")
    .select("*")
    .eq("user_id", user!.id)
    .eq("entry_date", selectedDate)   // exact date match — this is the critical fix
    .maybeSingle()) as { data: Entry | null; error: unknown };

  // ── Fetch entry dates for the displayed calendar month (dot indicators) ────
  const [y, m] = yearMonth.split("-").map(Number);
  const monthStart = `${yearMonth}-01`;
  const monthEnd = `${yearMonth}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;

  const { data: monthEntries } = (await db
    .from("entries")
    .select("entry_date")
    .eq("user_id", user!.id)
    .gte("entry_date", monthStart)
    .lte("entry_date", monthEnd)) as {
    data: { entry_date: string }[] | null;
    error: unknown;
  };

  const entryDates = (monthEntries ?? []).map(
    (e: { entry_date: string }) => e.entry_date
  );

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
      <header className="bg-white border-b border-amber-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-amber-800">Grateful Journal</h1>
          {profile && (
            <p className="text-sm text-amber-600">
              {profile.display_name} · 🔥 {profile.streak_count} day streak
            </p>
          )}
        </div>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="text-sm text-gray-500 hover:text-gray-700 transition"
          >
            Sign out
          </button>
        </form>
      </header>

      {/* Sidebar + editor */}
      <main className="max-w-5xl mx-auto px-4 py-8 flex gap-6 items-start">
        <CalendarSidebar
          yearMonth={yearMonth}
          entryDates={entryDates}
          selectedDate={selectedDate}
        />

        <div className="flex-1 min-w-0">
          <JournalEditor
            userId={user!.id}
            existingEntry={selectedEntry ?? null}
            entryDate={selectedDate}
            readOnly={!isToday}
          />
        </div>
      </main>
    </div>
  );
}
