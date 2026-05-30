"use client";

import { createClient } from "@/lib/supabase/client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getTodayLocal, formatDisplayDateWithDay } from "@/lib/date";
import type { Entry } from "@/types/database";

const MAX_PHOTOS = 5;

interface Props {
  userId: string;
  existingEntry: Entry | null;
  entryDate: string;   // YYYY-MM-DD
  readOnly?: boolean;  // true for past dates
}

// ── Small reusable icons ─────────────────────────────────────────────────────
function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

// ── Delete confirmation dialog ───────────────────────────────────────────────
function DeleteDialog({
  onConfirm,
  onCancel,
  deleting,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete this entry?</h3>
        <p className="text-sm text-gray-500 mb-6">
          Are you sure you want to delete this entry? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 border border-gray-200 text-gray-600 font-medium py-2 rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {deleting ? <><Spinner /> Deleting...</> : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function JournalEditor({
  userId,
  existingEntry,
  entryDate,
  readOnly = false,
}: Props) {
  const router = useRouter();

  // Content state
  const [content, setContent] = useState<string>(existingEntry?.content ?? "");

  // Edit mode: past entries start in read-only; this flips them editable
  const [isEditing, setIsEditing] = useState(false);

  // Delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Save / AI states
  const [saving, setSaving] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(existingEntry?.ai_response ?? null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Multi-photo state — initialise from media_urls (new) or legacy media_url
  const initialPhotos: string[] =
    existingEntry?.media_urls?.length
      ? existingEntry.media_urls
      : existingEntry?.media_url
      ? [existingEntry.media_url]
      : [];
  const [photoUrls, setPhotoUrls] = useState<string[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived
  const charCount = content.length;
  const isValid = charCount >= 50;
  // The textarea is editable when it's today's entry, or when editing a past entry
  const fieldReadOnly = readOnly && !isEditing;

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!existingEntry) return;
    setDeleting(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;
    await db.from("entries").delete().eq("id", existingEntry.id).eq("user_id", userId);
    setShowDeleteDialog(false);
    // Navigate to today — calendar will update automatically
    router.push("/journal");
    router.refresh();
  }

  // ── Photo upload ────────────────────────────────────────────────────────────
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remaining = MAX_PHOTOS - photoUrls.length;
    if (remaining <= 0) {
      setUploadError(`Maximum ${MAX_PHOTOS} photos allowed.`);
      return;
    }

    const toUpload = files.slice(0, remaining);
    setUploading(true);
    setUploadError(null);

    const supabase = createClient();
    const uploaded: string[] = [];

    for (const file of toUpload) {
      if (file.size > 50 * 1024 * 1024) {
        setUploadError(`"${file.name}" exceeds the 50 MB limit.`);
        continue;
      }
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${userId}/${getTodayLocal()}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { data, error } = await supabase.storage
        .from("journal-media")
        .upload(path, file, { upsert: true });

      if (error || !data) {
        setUploadError(error?.message ?? "Upload failed.");
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("journal-media")
        .getPublicUrl(data.path);

      uploaded.push(publicUrl);
    }

    setPhotoUrls((prev) => [...prev, ...uploaded].slice(0, MAX_PHOTOS));
    setUploading(false);
    // Reset input so the same file can be re-selected if removed
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleRemovePhoto(index: number) {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Save (new entry or edit) ────────────────────────────────────────────────
  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    setSaveMessage(null);
    setAiError(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    const todayToronto = getTodayLocal();

    const entryData = {
      user_id: userId,
      content,
      char_count: charCount,
      has_emotion_word: false,
      emotion_words_found: [],
      // For past-entry edits we keep the original entry_date; for new/today entries use live local date
      entry_date: existingEntry ? existingEntry.entry_date : todayToronto,
      media_urls: photoUrls,
      media_url: photoUrls[0] ?? null,   // keep legacy column in sync
      media_type: photoUrls.length > 0 ? "image" : null,
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
    // Return past-entry edits to read-only view after saving
    if (isEditing) setIsEditing(false);

    // ── AI reflection (only for today's new/updated entries) ─────────────────
    if (!savedId) return;
    // Skip AI call when editing a past entry to avoid an unnecessary API round-trip
    if (readOnly && !isEditing) return;

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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <DeleteDialog
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteDialog(false)}
          deleting={deleting}
        />
      )}

      <div className="space-y-5">
        {/* ── Entry card ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm p-6">

          {/* Header row */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {readOnly && !isEditing ? "Past Entry" : isEditing ? "Edit Entry" : "Today's Journal"}
              </h2>
              <p className="text-sm text-amber-600 mt-0.5">
                {formatDisplayDateWithDay(entryDate)}
              </p>
            </div>

            {/* Edit / Delete buttons — only on past entries in read-only mode */}
            {readOnly && !isEditing && existingEntry && (
              <div className="flex items-center gap-2 mt-0.5">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteDialog(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            )}

            {/* Cancel edit button */}
            {isEditing && (
              <button
                type="button"
                onClick={() => { setIsEditing(false); setContent(existingEntry?.content ?? ""); }}
                className="text-xs text-gray-400 hover:text-gray-600 mt-0.5 transition"
              >
                Cancel
              </button>
            )}

            {/* Read-only badge when not editing */}
            {readOnly && !isEditing && !existingEntry && (
              <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium mt-0.5">
                Read only
              </span>
            )}
          </div>

          {/* Text area */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            readOnly={fieldReadOnly}
            placeholder="Write freely about what you're grateful for today — big or small, anything counts. (minimum 50 characters)"
            rows={8}
            className={`w-full border rounded-xl px-4 py-3 text-gray-700 resize-none focus:outline-none text-base leading-relaxed transition ${
              fieldReadOnly
                ? "border-gray-100 bg-gray-50 cursor-default"
                : "border-gray-200 focus:ring-2 focus:ring-amber-300"
            }`}
          />

          {/* Character count — editable states only */}
          {!fieldReadOnly && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-400">
                {charCount >= 50 ? "✓ Ready to save" : `${50 - charCount} more characters needed`}
              </span>
              <span className={`text-sm font-medium ${charCount >= 50 ? "text-green-600" : "text-gray-400"}`}>
                {charCount} / 50+
              </span>
            </div>
          )}

          {/* ── Photos (editable mode) ──────────────────────────────────────── */}
          {!fieldReadOnly && (
            <div className="mt-4 space-y-3">
              {/* Thumbnails grid */}
              {photoUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photoUrls.map((url, i) => (
                    <div key={url} className="relative group aspect-square rounded-xl overflow-hidden border border-amber-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(i)}
                        className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                        aria-label={`Remove photo ${i + 1}`}
                      >
                        <XIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button — hidden when at limit */}
              {photoUrls.length < MAX_PHOTOS && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 border border-dashed border-amber-300 hover:border-amber-400 rounded-xl px-4 py-2.5 transition disabled:opacity-50 w-full justify-center"
                  >
                    {uploading ? (
                      <><Spinner /> Uploading...</>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Add photos ({photoUrls.length}/{MAX_PHOTOS})
                      </>
                    )}
                  </button>
                </>
              )}

              {uploadError && <p className="text-red-500 text-xs">{uploadError}</p>}
            </div>
          )}

          {/* ── Photos (read-only view) ─────────────────────────────────────── */}
          {fieldReadOnly && photoUrls.length > 0 && (
            <div className={`mt-4 grid gap-2 ${photoUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {photoUrls.map((url, i) => (
                <div key={url} className="rounded-xl overflow-hidden border border-amber-100 aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Save button */}
          {!fieldReadOnly && (
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
                ? "Save Changes"
                : "Save Entry"}
            </button>
          )}

          {saveMessage && (
            <p className={`text-center text-sm mt-3 font-medium ${saveMessage.startsWith("❌") ? "text-red-500" : "text-green-600"}`}>
              {saveMessage}
            </p>
          )}
        </div>

        {/* ── No entry state ───────────────────────────────────────────────── */}
        {readOnly && !existingEntry && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-500 text-sm">No entry was written on this day.</p>
          </div>
        )}

        {/* ── AI reflection card ───────────────────────────────────────────── */}
        {(loadingAi || aiResponse || aiError) && (
          <div className={`rounded-2xl p-6 shadow-sm border ${
            aiError
              ? "bg-red-50 border-red-200"
              : "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200"
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{aiError ? "⚠️" : "✨"}</span>
              <p className={`text-sm font-semibold uppercase tracking-wide ${aiError ? "text-red-600" : "text-amber-700"}`}>
                {aiError ? "AI Reflection Unavailable" : "A reflection from your journal coach"}
              </p>
            </div>

            {loadingAi && (
              <div className="flex items-center gap-2 text-amber-600">
                <Spinner className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">Generating a personal reflection...</span>
              </div>
            )}
            {aiError && !loadingAi && <p className="text-red-600 text-sm">{aiError}</p>}
            {aiResponse && !loadingAi && <p className="text-gray-700 leading-relaxed">{aiResponse}</p>}
          </div>
        )}
      </div>
    </>
  );
}
