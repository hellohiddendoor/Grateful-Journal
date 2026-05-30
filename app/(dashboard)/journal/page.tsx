import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import JournalEditor from "@/components/JournalEditor";
import CalendarSidebar from "@/components/CalendarSidebar";
import { getTodayLocal, getCurrentMonthLocal } from "@/lib/date";
import type { Entry, Profile } from "@/types/database";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
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
  // Clamp requested date: no future dates allowed
  const selectedDate =
    params.date && params.date <= today ? params.date : today;
  const isToday = selectedDate === today;

  // Determine which month to show in the calendar
  const yearMonth = selectedDate.slice(0, 7) || getCurrentMonthLocal();

  // Fetch entry for the selected date
  const { data: selectedEntry } = (await db
    .from("entries")
    .select("*")
    .eq("user_id", user!.id)
    .eq("entry_date", selectedDate)
    .single()) as { data: Entry | null; error: unknown };

  // Fetch all entry dates for the current calendar month (for dot indicators)
  const monthStart = `${yearMonth}-01`;
  const [y, m] = yearMonth.split("-").map(Number);
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

  const entryDates = (monthEntries ?? []).map((e) => e.entry_date);

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

      {/* Main layout — sidebar + editor */}
      <main className="max-w-5xl mx-auto px-4 py-8 flex gap-6 items-start">
        {/* Calendar */}
        <CalendarSidebar
          yearMonth={yearMonth}
          entryDates={entryDates}
          selectedDate={selectedDate}
        />

        {/* Journal editor */}
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
