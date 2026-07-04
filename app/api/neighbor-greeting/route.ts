import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rateLimit";
import { logUsage } from "@/lib/usageLog";

// ★서로이웃 신청 인사말 생성 — 유저 블로그 주제 기반 개인화, 2~3문장.
//  절대 규칙: 타인 글에 다는 '댓글'은 생성하지 않는다(어뷰징 선). 이 라우트는 이웃 신청 인사말만.
export async function POST() {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 503 });

  const rl = await checkRateLimit(supabase, user.id, "neighbor_greeting", 20, 86400);
  if (!rl.ok) return NextResponse.json({ error: "오늘은 충분히 만들었어요. 내일 다시 만들 수 있어요." }, { status: 429 });

  const { data: p } = await supabase.from("blog_profiles").select("sub_category, topic, blog_name").eq("user_id", user.id).maybeSingle();
  const subject = (p?.sub_category || p?.topic || "블로그").toString().slice(0, 30);

  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 220,
      messages: [{ role: "user", content: `네이버 블로그 서로이웃 신청 인사말 1개를 만들어라.

내 블로그 주제: ${subject}

규칙:
- 2~3문장, 존댓말, 담백하게. 과한 아부·이모지·특수기호 금지.
- 상대 블로그를 읽고 왔다는 뉘앙스 + 내 주제 소개 + 소통 제안. 구체적 거짓말(특정 글 제목 언급 등)은 금지 — 어떤 블로그에 보내도 자연스럽게.
- "무조건·맞팔·품앗이" 같은 단어 금지. 판매·홍보 냄새 금지.
- 매번 어투와 구성을 조금씩 다르게(변주 시드: ${Math.floor(Math.random() * 1000)}).
- 인사말 텍스트만 출력(따옴표·설명 없이).` }],
    });
    void logUsage({ userId: user.id, model: "claude-haiku-4-5", kind: "neighbor_greeting", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
    const text = (res.content[0]?.type === "text" ? res.content[0].text : "").trim().replace(/^["']|["']$/g, "").slice(0, 300);
    if (!text) return NextResponse.json({ error: "다시 시도해 주세요." }, { status: 502 });
    return NextResponse.json({ greeting: text });
  } catch {
    return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
