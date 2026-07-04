import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rateLimit";
import { logUsage } from "@/lib/usageLog";
import { assignGreeting, greetViolates } from "@/lib/greeting";

// ★서로이웃 신청 인사말 생성 — 유저 블로그 주제 기반 개인화, 2~3문장.
//  절대 규칙: 타인 글에 다는 '댓글'은 생성하지 않는다(어뷰징 선). 이 라우트는 이웃 신청 인사말만.
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 503 });

  const rl = await checkRateLimit(supabase, user.id, "neighbor_greeting", 20, 86400);
  if (!rl.ok) return NextResponse.json({ error: "오늘은 충분히 만들었어요. 내일 다시 만들 수 있어요." }, { status: 429 });

  const { data: p } = await supabase.from("blog_profiles").select("sub_category, topic, blog_name, target, audience").eq("user_id", user.id).maybeSingle();
  const subject = (p?.sub_category || p?.topic || "블로그").toString().slice(0, 30);
  const target = (p?.target ?? "").toString().slice(0, 40);
  const body = await request.json().catch(() => ({}));
  const variant = Number.isInteger(body?.variant) ? Math.abs(body.variant as number) % 97 : 0;
  const a = assignGreeting(user.id, variant); // ★구조는 코드가 배정(유저 간 분산), 문장은 LLM

  const prompt = `네이버 블로그 서로이웃 신청 인사말 1개를 만들어라.

[내 블로그] 주제: ${subject}${target ? ` / 주 독자: ${target}` : ""}

[배정된 구조 — 그대로 따를 것]
- 도입: ${a.open.guide}\n- 첫 문장 소재: ${a.lead}
- 길이: 정확히 ${a.len}문장.
- 마무리: ${a.close.guide}

규칙:
- 존댓말, 담백하게. 과한 아부·이모지·특수기호 금지.
- ★첫 어절 규칙: "저는"·"안녕하세요"·블로그 주제어(예: 재테크)로 문장을 시작하지 마라. "좋은 글이 많네요"·"블로그를 둘러보니" 같은 상투 도입도 금지 — 배정된 첫 문장 소재에서 구체적인 단어로 연다.
- ★과공손 상투구 금지: "소중한 인연", "좋은 하루 되세요" 류.
- ★상대의 글 내용을 구체적으로 단정하는 문장 금지("~다루셨더라고요" 류 — 실제로 읽지 않았다). 상대 언급은 카테고리 수준까지만. "무조건·맞팔·품앗이" 금지. 판매·홍보 냄새 금지.
- 인사말 텍스트만 출력(따옴표·설명 없이).`;

  try {
    const client = new Anthropic({ apiKey });
    const gen = async () => {
      const res = await client.messages.create({ model: "claude-haiku-4-5", max_tokens: 220, messages: [{ role: "user", content: prompt }] });
      void logUsage({ userId: user.id, model: "claude-haiku-4-5", kind: "neighbor_greeting", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
      return (res.content[0]?.type === "text" ? res.content[0].text : "").trim().replace(/^["\']|["\']$/g, "").slice(0, 300);
    };
    let text = await gen();
    if (greetViolates(text)) text = await gen(); // 상투구·동일 도입 검출 → 1회 재생성
    if (!text) return NextResponse.json({ error: "다시 시도해 주세요." }, { status: 502 });
    return NextResponse.json({ greeting: text });
  } catch {
    return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
