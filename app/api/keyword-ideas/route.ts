import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rateLimit";
import { logUsage } from "@/lib/usageLog";
import { ensureUserRow, rolloverIfNeeded } from "@/lib/userPlan";

/**
 * 분야/주제를 받아 '바로 글로 쓸 만한' 한국어 블로그 글감 키워드를 추천한다. (로그인 사용자, haiku)
 * "뭘 써야 할지 모르겠어요"를 해결 → 추천 키워드를 누르면 그대로 생성으로 이어진다.
 */
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 완료되지 않았습니다." }, { status: 500 });
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  // 버스트(연타) 방지
  const rlBurst = await checkRateLimit(supabase, user.id, "keyword_ideas", 5, 300);
  if (!rlBurst.ok) {
    return NextResponse.json({ error: `추천이 너무 잦아요. ${rlBurst.retryAfterSec ?? 60}초 후 다시 시도해 주세요.` }, { status: 429 });
  }

  // 글감 추천 한도 = 글 한도 × 3 (무료 평생 9회 / 프로 월 90회). 프로는 결제주기에 리셋.
  let row = await ensureUserRow(supabase, user.id, user.email);
  row = await rolloverIfNeeded(row);
  const ideasUsed = row.keyword_ideas_used ?? 0;
  const ideasCap = (row.articles_limit ?? 0) * 3;
  if (ideasCap > 0 && ideasUsed >= ideasCap) {
    return NextResponse.json(
      {
        error:
          row.plan === "free"
            ? "무료 글감 추천을 다 썼어요. 프로로 업그레이드하면 더 추천받을 수 있어요."
            : "이번 달 글감 추천 한도를 다 썼어요. 다음 결제주기에 다시 채워져요.",
        upgrade: row.plan === "free",
      },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const topic = (typeof body.topic === "string" ? body.topic : "").trim().slice(0, 60);
  if (!topic) return NextResponse.json({ error: "분야나 주제를 입력해 주세요." }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI 설정이 완료되지 않았습니다." }, { status: 500 });

  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content:
            `‘${topic}’ 분야의 블로그에 바로 쓸 만한 글감(검색 키워드) 9개를 추천해줘.\n` +
            "규칙: ① 한국 사람이 실제로 구글/네이버에 검색하는 구체적인 롱테일 키워드 ② 검색 의도를 다양하게(방법·추천·후기·비교·가격·주의점 등) ③ 너무 광범위한 한 단어 금지, 문장형 금지 ④ 각 키워드는 바로 글 제목 소재가 되게 구체적으로.\n" +
            "출력은 JSON 배열만. 예: [\"강아지 분리불안 훈련 방법\",\"소형견 사료 추천 2026\",\"강아지 슬개골 탈구 초기 증상\"]",
        },
      ],
    });
    void logUsage({ userId: user.id, model: "claude-haiku-4-5", kind: "keyword_ideas", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
    // 사용량 +1 (서비스롤 — 컬럼 없으면 무시). 호출=비용이므로 결과와 무관하게 카운트.
    void createSupabaseAdminClient().from("users").update({ keyword_ideas_used: ideasUsed + 1 }).eq("id", user.id);
    const t = res.content.find((b) => b.type === "text");
    const raw = t && t.type === "text" ? t.text : "[]";
    const match = raw.match(/\[[\s\S]*\]/);
    let ideas: string[] = [];
    if (match) {
      try {
        const arr = JSON.parse(match[0]);
        if (Array.isArray(arr)) {
          const seen = new Set<string>();
          ideas = arr
            .filter((x): x is string => typeof x === "string")
            .map((x) => x.trim().replace(/^["'#\-•\d.\s]+/, "").slice(0, 60))
            .filter((x) => x && !seen.has(x) && seen.add(x))
            .slice(0, 9);
        }
      } catch {
        // 무시
      }
    }
    return NextResponse.json({ ideas });
  } catch {
    return NextResponse.json({ error: "글감 추천에 실패했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
