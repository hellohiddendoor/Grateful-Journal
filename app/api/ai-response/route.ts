import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const { entryId, content } = (await request.json()) as {
    entryId: string;
    content: string;
  };

  if (!entryId || !content) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
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

  const aiResponse =
    message.content[0].type === "text" ? message.content[0].text : "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("entries")
    .update({ ai_response: aiResponse })
    .eq("id", entryId)
    .eq("user_id", user.id);

  return NextResponse.json({ aiResponse });
}
