import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const { entryId, content } = await request.json() as { entryId: string; content: string };

  if (!entryId || !content) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    system:
      "당신은 따뜻하고 공감 능력이 뛰어난 감사 일기 코치입니다. 사용자가 쓴 감사 일기를 읽고 2-3문장으로 따뜻하게 격려하는 짧은 피드백을 한국어로 작성해 주세요. 감사함을 더 깊이 느낄 수 있도록 도와주세요.",
    messages: [
      {
        role: "user",
        content: `오늘의 감사 일기:\n\n${content}`,
      },
    ],
  });

  const aiResponse =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Cast to `any` for table query only — auth above stays fully typed.
  // The Database generic causes from() to resolve as `never` under strict mode.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("entries")
    .update({ ai_response: aiResponse })
    .eq("id", entryId)
    .eq("user_id", user.id);

  return NextResponse.json({ aiResponse });
}
