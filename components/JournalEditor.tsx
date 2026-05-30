"use client";

import { createClient } from "@/lib/supabase/client";
import { useRef, useState } from "react";
import { getTodayLocal, formatDisplayDateWithDay } from "@/lib/date";
import type { Entry } from "@/types/database";

interface Props {
  userId: string;
  existingEntry: Entry | null;
  entryDate: string;    // YYYY-MM-DD
  readOnly?: boolean;
}

export default function JournalEditor({
  userId,
  existingEntry,
  entryDate,
  readOnly = false,
}: Props) {
  const [content, setContent] = useState<string>(existingEntry?.content ?? "");
  const [aiResponse, setAiResponse] = useState<string | null>(existingEntry?.ai_response ?? null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Media upload state
  const [mediaUrl, setMediaUrl] = useState<string | null>(existingEntry?.media_url ?? null);
  const [mediaType, setMediaType] = useState<string | null>(existingEntry?.media_type ?? null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = content.length;
  const isValid = charCount >= 50;

  // ── Media upload ────────────────────────────────────────────────────────────
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_MB = 50;
    if (file.size > MAX_MB * 1024 * 1024) {
      setUploadError(`File must be under ${MAX_MB} MB.`);
      return;
    }

    setUploading(true);
    setUploadError(null);

    // Use the typed client — storage doesn't have the Database generic issue
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "bin";
    // Use client-side Toronto date for the folder path, same as entry_date
    const path = `${userId}/${getTodayLocal()}/${Date.now()}.${ext}`;

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from("journal-media")
      .upload(path, file, { upsert: true });

    if (uploadErr || !uploadData) {
      setUploadError(uploadErr?.message ?? "Upload failed.");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("journal-media")
      .getPublicUrl(uploadData.path);

    setMediaUrl(publicUrl);
    setMediaType(file.type.startsWith("video/") ? "video" : "image");
    setUploading(false);
  }

  function handleRemoveMedia() {
    setMediaUrl(null);
    setMediaType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Save entry ──────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!isValid || readOnly) return;
    setSaving(true);
    setSaveMessage(null);
    setAiError(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    // Compute the entry date client-side at save-time in America/Toronto timezone.
    // Do NOT use the server-rendered `entryDate` prop here — it was computed at
    // page-load time and could be stale if the user crosses midnight, or if the
    // server ran without full ICU data. getTodayLocal() calls the browser's own
    // Intl API with the explicit timezone, which is always accurate.
    const todayToronto = getTodayLocal();

    const entryData = {
      user_id: userId,
      content,
      char_count: charCount,
      has_emotion_word: false,
      emotion_words_found: [],
      entry_date: todayToronto,
      media_url: mediaUrl ?? null,
      media_type: mediaType ?? null,
    };

    let savedId: string | null = null;

    if (existingEntry) {
      const { data, error } = (await db
        .from("entries")
        .update(entryData)
        .eq("id", existingEntry.id)
        .select("id")
        .single()) as { data: { id: string } | null; error: { message: string } | null };

      if (error || !data) {
        setSaveMessage("❌ Save failed: " + (error?.message ?? "Unknown error"));
        setSaving(false);
        return;
      }
      savedId = data.id;
    } else {
      const { data, error } = (await db
        .from("entries")
        .insert(entryData)
        .select("id")
        .single()) as { data: { id: string } | null; error: { message: string } | null };

      if (error || !data) {
        setSaveMessage("❌ Save failed: " + (error?.message ?? "Unknown error"));
        setSaving(false);
        return;
      }
      savedId = data.id;
    }

    setSaving(false);
    setSaveMessage("✓ Entry saved!");

    // ── Fetch AI response ─────────────────────────────────────────────────────
    if (!savedId) return;
    setLoadingAi(true);
    setAiResponse(null);

    try {
      const res = await fetch("/api/ai-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: savedId, content }),
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errJson.error ?? `HTTP ${res.status}`);
      }

      const json = (await res.json()) as { aiResponse?: string };

      if (json.aiResponse) {
        setAiResponse(json.aiResponse);
      } else {
        throw new Error("No response returned from AI.");
      }
    } catch (err) {
      setAiError(
        `Couldn't get an AI reflection: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setLoadingAi(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Entry card ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        {/* Date + status badge */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {readOnly ? "Past Entry" : "Today's Journal"}
            </h2>
            <p className="text-sm text-amber-600 mt-0.5">
              {formatDisplayDateWithDay(entryDate)}
            </p>
          </div>
          {readOnly && (
            <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium mt-0.5">
              Read only
            </span>
          )}
        </div>

        {/* Text area */}
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
              {charCount >= 50 ? "✓ Ready to save" : `${50 - charCount} more characters needed`}
            </span>
            <span className={`text-sm font-medium ${charCount >= 50 ? "text-green-600" : "text-gray-400"}`}>
              {charCount} / 50+
            </span>
          </div>
        )}

        {/* ── Media attachment ─────────────────────────────────────────────── */}
        {!readOnly && (
          <div className="mt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            {!mediaUrl ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 border border-dashed border-amber-300 hover:border-amber-400 rounded-xl px-4 py-2.5 transition disabled:opacity-50 w-full justify-center"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    Add a photo or video (optional)
                  </>
                )}
              </button>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-amber-200">
                {mediaType === "video" ? (
                  <video src={mediaUrl} controls className="w-full max-h-64 object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl} alt="Attached photo" className="w-full max-h-64 object-cover" />
                )}
                <button
                  type="button"
                  onClick={handleRemoveMedia}
                  className="absolute top-2 right-2 bg-white/80 hover:bg-white text-gray-600 rounded-full p-1 shadow transition"
                  aria-label="Remove media"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            )}

            {uploadError && (
              <p className="text-red-500 text-xs mt-1.5">{uploadError}</p>
            )}
          </div>
        )}

        {/* Existing media on past entries (read-only view) */}
        {readOnly && existingEntry?.media_url && (
          <div className="mt-4 rounded-xl overflow-hidden border border-amber-100">
            {existingEntry.media_type === "video" ? (
              <video src={existingEntry.media_url} controls className="w-full max-h-64 object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={existingEntry.media_url} alt="Attached photo" className="w-full max-h-64 object-cover" />
            )}
          </div>
        )}

        {/* Save button */}
        {!readOnly && (
          <button
            onClick={handleSave}
            disabled={!isValid || saving || loadingAi || uploading}
            className="mt-5 w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl transition"
          >
            {saving
              ? "Saving..."
              : loadingAi
              ? "Getting AI reflection..."
              : existingEntry
              ? "Update Entry"
              : "Save Entry"}
          </button>
        )}

        {saveMessage && (
          <p className={`text-center text-sm mt-3 font-medium ${saveMessage.startsWith("❌") ? "text-red-500" : "text-green-600"}`}>
            {saveMessage}
          </p>
        )}
      </div>

      {/* ── No entry state (past date with nothing written) ─────────────────── */}
      {readOnly && !existingEntry && (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-500 text-sm">No entry was written on this day.</p>
        </div>
      )}

      {/* ── AI response card ─────────────────────────────────────────────────── */}
      {(loadingAi || aiResponse || aiError) && (
        <div className={`rounded-2xl p-6 shadow-sm border ${aiError ? "bg-red-50 border-red-200" : "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200"}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{aiError ? "⚠️" : "✨"}</span>
            <p className={`text-sm font-semibold uppercase tracking-wide ${aiError ? "text-red-600" : "text-amber-700"}`}>
              {aiError ? "AI Reflection Unavailable" : "A reflection from your journal coach"}
            </p>
          </div>

          {loadingAi && (
            <div className="flex items-center gap-2 text-amber-600">
              <svg className="animate-spin h-4 w-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              <span className="text-sm">Generating a personal reflection...</span>
            </div>
          )}

          {aiError && !loadingAi && (
            <p className="text-red-600 text-sm">{aiError}</p>
          )}

          {aiResponse && !loadingAi && (
            <p className="text-gray-700 leading-relaxed">{aiResponse}</p>
          )}
        </div>
      )}

      {/* Show existing AI response for past entries */}
      {readOnly && existingEntry?.ai_response && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">✨</span>
            <p className="text-sm font-semibold text-amber-700 uppercase tracking-wide">
              Journal coach reflection
            </p>
          </div>
          <p className="text-gray-700 leading-relaxed">{existingEntry.ai_response}</p>
        </div>
      )}
    </div>
  );
}
