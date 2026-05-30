"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { formatDisplayDateWithDay } from "@/lib/date";
import type { Entry } from "@/types/database";

interface Props {
  userId: string;
  existingEntry: Entry | null;
  entryDate: string;    // YYYY-MM-DD
  readOnly?: boolean;   // true when viewing a past date
}

export default function JournalEditor({
  userId,
  existingEntry,
  entryDate,
  readOnly = false,
}: Props) {
  const [content, setContent] = useState<string>(existingEntry?.content ?? "");
  const [aiResponse, setAiResponse] = useState<string | null>(
    existingEntry?.ai_response ?? null
  );
  const [saving, setSaving] = useState<boolean>(false);
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  const charCount = content.length;
  const isValid = charCount >= 50;

  async function handleSave(): Promise<void> {
    if (!isValid || readOnly) return;
    setSaving(true);
    setMessage(null);
    setAiResponse(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any;

    const entryData = {
      user_id: userId,
      content,
      char_count: charCount,
      has_emotion_word: false,
      emotion_words_found: [],
      entry_date: entryDate,
    };

    let savedEntry: Entry | null = null;

    if (existingEntry) {
      const { data, error } = (await supabase
        .from("entries")
        .update(entryData)
        .eq("id", existingEntry.id)
        .select()
        .single()) as { data: Entry | null; error: { message: string } | null };
      if (error) {
        setMessage("❌ Failed to save: " + error.message);
        setSaving(false);
        return;
      }
      savedEntry = data;
    } else {
      const { data, error } = (await supabase
        .from("entries")
        .insert(entryData)
        .select()
        .single()) as { data: Entry | null; error: { message: string } | null };
      if (error) {
        setMessage("❌ Failed to save: " + error.message);
        setSaving(false);
        return;
      }
      savedEntry = data;
    }

    setSaving(false);
    setMessage("✓ Entry saved!");

    // Fetch AI response
    if (savedEntry) {
      setLoadingAi(true);
      try {
        const res = await fetch("/api/ai-response", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entryId: savedEntry.id, content }),
        });
        const json = (await res.json()) as { aiResponse?: string };
        if (json.aiResponse) {
          setAiResponse(json.aiResponse);
        }
      } catch {
        // AI response is non-critical
      } finally {
        setLoadingAi(false);
      }
    }
  }

  return (
    <div className="space-y-5">
      {/* Entry card */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {readOnly ? "Past Entry" : "Today's Journal"}
            </h2>
            <p className="text-sm text-amber-600 mt-0.5">
              {formatDisplayDateWithDay(entryDate)}
            </p>
          </div>
          {readOnly && (
            <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">
              Read only
            </span>
          )}
        </div>

        <textarea
          value={content}
          onChange={(e) => !readOnly && setContent(e.target.value)}
          readOnly={readOnly}
          placeholder="Write freely about what you're grateful for today — big or small, anything counts. (minimum 50 characters)"
          rows={8}
          className={`w-full border rounded-xl px-4 py-3 text-gray-700 resize-none focus:outline-none text-base leading-relaxed ${
            readOnly
              ? "border-gray-100 bg-gray-50 cursor-default"
              : "border-gray-200 focus:ring-2 focus:ring-amber-300"
          }`}
        />

        {!readOnly && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">
              {charCount >= 50
                ? "✓ Ready to save"
                : `${50 - charCount} more characters needed`}
            </span>
            <span
              className={`text-sm font-medium ${
                charCount >= 50 ? "text-green-600" : "text-gray-400"
              }`}
            >
              {charCount} / 50+
            </span>
          </div>
        )}

        {!readOnly && (
          <button
            onClick={handleSave}
            disabled={!isValid || saving || loadingAi}
            className="mt-4 w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl transition"
          >
            {saving
              ? "Saving..."
              : loadingAi
              ? "Getting AI response..."
              : existingEntry
              ? "Update Entry"
              : "Save Entry"}
          </button>
        )}

        {message && (
          <p className="text-center text-sm text-green-600 mt-3 font-medium">{message}</p>
        )}
      </div>

      {/* AI Response — shown while loading and after */}
      {(loadingAi || aiResponse) && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">✨</span>
            <p className="text-sm font-semibold text-amber-700 uppercase tracking-wide">
              A reflection from your journal coach
            </p>
          </div>
          {loadingAi ? (
            <div className="flex items-center gap-2 text-amber-600">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-sm">Generating a personal reflection...</span>
            </div>
          ) : (
            <p className="text-gray-700 leading-relaxed">{aiResponse}</p>
          )}
        </div>
      )}
    </div>
  );
}
