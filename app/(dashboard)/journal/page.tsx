import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import JournalEditor from "@/components/JournalEditor";

export default async function JournalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const today = new Date().toISOString().split("T")[0];
  const { data: todayEntry } = await supabase
    .from("entries")
    .select("*")
    .eq("user_id", user.id)
    .eq("entry_date", today)
    .single();

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-white border-b border-amber-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-amber-800">Grateful Journal</h1>
          {profile && (
            <p className="text-sm text-amber-600">
              {profile.display_name}님 · 🔥 {profile.streak_count}일 연속
            </p>
          )}
        </div>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            로그아웃
          </button>
        </form>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <JournalEditor
          userId={user.id}
          existingEntry={todayEntry ?? null}
          entryDate={today}
        />
      </main>
    </div>
  );
}
