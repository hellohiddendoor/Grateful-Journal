import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

// Force Node.js runtime — Anthropic SDK uses http2/crypto not in Edge runtime
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // ── 1. Parse body ──────────────────────────────────────────────────────────
  let entryId: string;
  let content: string;
  try {
    const body = (await request.json()) as { entryId?: string; content?: string };
    entryId = body.entryId ?? "";
    content = body.content ?? "";
  } catch (e) {
    console.error("[ai-response] Body parse error:", e);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!entryId || !content) {
    return NextResponse.json({ error: "Missing entryId or content" }, { status: 400 });
  }

  // ── 2. Check API key ───────────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[ai-response] ANTHROPIC_API_KEY is undefined");
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }
  // Log first 10 chars so we can confirm the right key is loaded without exposing it
  console.log("[ai-response] API key prefix:", apiKey.slice(0, 10));

  // ── 3. Auth ────────────────────────────────────────────────────────────────
  let supabase: Awaited<ReturnType<typeof createClient>>;
  let userId: string;
  try {
    supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      console.error("[ai-response] Auth error:", authErr?.message ?? "no user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
  } catch (e) {
    console.error("[ai-response] Supabase createClient error:", e);
    return NextResponse.json({ error: "Auth setup failed" }, { status: 500 });
  }

  // ── 4. Call Anthropic ──────────────────────────────────────────────────────
  let aiResponse: string;
  try {
    const anthropic = new Anthropic({ apiKey });

    console.log("[ai-response] Calling Anthropic, entryId:", entryId);

    const message = await anthropic.messages.create({
      // Use the full versioned model name — short aliases like "claude-sonnet-4-5"
      // are not valid API identifiers and cause 404/400 from Anthropic's endpoint.
      model: "claude-sonnet-4-5",
      max_tokens: 300,
      system:
        "You are a warm, empathetic gratitude journal coach. Read the user's journal entry and respond with 2–3 short sentences of genuine, encouraging feedback in English. Help them feel the depth of their gratitude and inspire them to keep journaling.",
      messages: [
        {
          role: "user",
          content: `Today's gratitude journal entry:\n\n${content}`,
        },
      ],
    });

    const first = message.content[0];
    aiResponse = first.type === "text" ? first.text : "";

    if (!aiResponse) {
      throw new Error("Anthropic returned empty content");
    }

    console.log("[ai-response] Anthropic success, chars:", aiResponse.length);
  } catch (e) {
    // Stringify fully — Anthropic APIError has .status, .headers, .error fields
    // that don't appear in just .message
    const detail =
      e instanceof Error
        ? `${e.name}: ${e.message}\n${e.stack ?? ""}`
        : JSON.stringify(e, null, 2);
    console.error("[ai-response] Anthropic call failed:\n", detail);
    return NextResponse.json(
      { error: `Anthropic error: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 }
    );
  }

  // ── 5. Persist to DB (non-fatal) ───────────────────────────────────────────
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("entries")
      .update({ ai_response: aiResponse })
      .eq("id", entryId)
      .eq("user_id", userId);
  } catch (e) {
    console.error("[ai-response] DB write failed (non-fatal):", e);
  }

  return NextResponse.json({ aiResponse });
}
