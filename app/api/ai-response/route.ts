import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

// Force Node.js runtime — the Anthropic SDK uses Node-native APIs
// (http2, crypto) that are not available in the Edge runtime.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // ── 1. Parse request body ──────────────────────────────────────────────────
  let entryId: string;
  let content: string;

  try {
    const body = (await request.json()) as { entryId?: string; content?: string };
    entryId = body.entryId ?? "";
    content = body.content ?? "";
  } catch (e) {
    console.error("[ai-response] Failed to parse request body:", e);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!entryId || !content) {
    return NextResponse.json({ error: "Missing entryId or content" }, { status: 400 });
  }

  // ── 2. Verify ANTHROPIC_API_KEY is present ─────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[ai-response] ANTHROPIC_API_KEY is not set in environment variables");
    return NextResponse.json(
      { error: "Server configuration error: missing API key" },
      { status: 500 }
    );
  }

  // ── 3. Verify Supabase session ─────────────────────────────────────────────
  let userId: string;
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("[ai-response] Auth error:", authError?.message ?? "No user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    // ── 4. Call Anthropic API ────────────────────────────────────────────────
    let aiResponse: string;
    try {
      const anthropic = new Anthropic({ apiKey });
      const message = await anthropic.messages.create({
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

      aiResponse =
        message.content[0].type === "text" ? message.content[0].text : "";

      if (!aiResponse) {
        throw new Error("Anthropic returned an empty response");
      }
    } catch (anthropicError) {
      console.error("[ai-response] Anthropic API error:", anthropicError);
      const msg =
        anthropicError instanceof Error ? anthropicError.message : String(anthropicError);
      return NextResponse.json(
        { error: `AI service error: ${msg}` },
        { status: 502 }
      );
    }

    // ── 5. Save AI response to Supabase ──────────────────────────────────────
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("entries")
        .update({ ai_response: aiResponse })
        .eq("id", entryId)
        .eq("user_id", userId);
    } catch (dbError) {
      // Non-fatal: the AI text is returned even if the DB write fails
      console.error("[ai-response] Failed to save ai_response to DB:", dbError);
    }

    return NextResponse.json({ aiResponse });
  } catch (e) {
    console.error("[ai-response] Unexpected error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Unexpected server error: ${msg}` },
      { status: 500 }
    );
  }
}
