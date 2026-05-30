import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import JournalEditor from "@/components/JournalEditor";
import { getTodayLocal, formatDisplayDate } from "@/lib/date";
import type { Entry, Profile } from "@/types/database";

export default async function JournalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Cast to `any` for table queries only — the Database generic causes
  // from() to resolve as `never` under strict mode; auth stays fully typed above.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: profile } = (await db
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single()) as { data: Profile | null; error: unknown };

  const today = getTodayLocal(); // YYYY-MM-DD in America/Toronto timezone

  const { data: todayEntry } = (await db
    .from("entries")
    .select("*")
    .eq("user_id", user!.id)
    .eq("entry_date", today)
    .single()) as { data: Entry | null; error: unknown };

  return (
    <div className="min-h-screen bg-amber-50">
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
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Sign out
          </button>
        </form>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <JournalEditor
          userId={user!.id}
          existingEntry={todayEntry ?? null}
          entryDate={today}
        />
      </main>
    </div>
  );
}
