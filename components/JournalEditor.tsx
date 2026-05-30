"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import type { Entry } from "@/types/database";

const EMOTION_WORDS = [
  "감사", "기쁨", "행복", "사랑", "설렘", "뿌듯", "따뜻", "평온", "안도",
  "희망", "즐거움", "만족", "편안", "그리움", "감동", "위로", "신남",
  "고마움", "다행", "보람", "충만", "벅참",
];

interface Props {
  userId: string;
  existingEntry: Entry | null;
  entryDate: string;
}

export default function JournalEditor({ userId, existingEntry, entryDate }: Props) {
  const [content, setContent] = useState<string>(existingEntry?.content ?? "");
  const [aiResponse, setAiResponse] = useState<string | null>(
    existingEntry?.ai_response ?? null
  );
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  const foundEmotionWords = EMOTION_WORDS.filter((w) => content.includes(w));
  const charCount = content.length;
  const isValid = charCount >= 50;

  async function handleSave(): Promise<void> {
    if (!isValid) return;
    setSaving(true);
    setMessage(null);

    // Cast to `any` for table queries — the Database generic causes from()
    // to resolve as `never` under strict mode.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any; // browser client, no auth calls needed here

    const entryData = {
      user_id: userId,
      content,
      char_count: charCount,
      has_emotion_word: foundEmotionWords.length > 0,
      emotion_words_found: foundEmotionWords,
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
        setMessage("Save failed: " + error.message);
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
        setMessage("Save failed: " + error.message);
        setSaving(false);
        return;
      }
      savedEntry = data;
    }

    // Request AI response — non-critical, errors are swallowed
    if (savedEntry) {
      try {
        const res = await fetch("/api/ai-response", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entryId: savedEntry.id, content }),
        });
        const json = (await res.json()) as { aiResponse?: string };
        if (json.aiResponse) setAiResponse(json.aiResponse);
      } catch (_e) {
        // AI response is non-critical — continue silently
      }
    }

    setMessage("Saved ✓");
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">
            Today&apos;s Grateful Journal
          </h2>
          <span className="text-sm text-gray-400">{entryDate}</span>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write freely about what you're grateful for today. (minimum 50 characters)"
          rows={8}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300 text-base leading-relaxed"
        />

        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-2 flex-wrap">
            {foundEmotionWords.map((w) => (
              <span
                key={w}
                className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full"
              >
                {w}
              </span>
            ))}
          </div>
          <span
            className={`text-sm font-medium ${
              charCount >= 50 ? "text-green-600" : "text-gray-400"
            }`}
          >
            {charCount} chars{charCount < 50 && ` (${50 - charCount} more)`}
          </span>
        </div>

        <button
          onClick={handleSave}
          disabled={!isValid || saving}
          className="mt-4 w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl transition"
        >
          {saving ? "Saving..." : existingEntry ? "Update entry" : "Save today's entry"}
        </button>

        {message && (
          <p className="text-center text-sm text-green-600 mt-2">{message}</p>
        )}
      </div>

      {aiResponse && (
        <div className="bg-amber-100 border border-amber-200 rounded-2xl p-6">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">
            A warm word from AI
          </p>
          <p className="text-gray-700 leading-relaxed">{aiResponse}</p>
        </div>
      )}
    </div>
  );
}
