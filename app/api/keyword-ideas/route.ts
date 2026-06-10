import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rateLimit";
import { logUsage } from "@/lib/usageLog";
import { ensureUserRow, rolloverIfNeeded } from "@/lib/userPlan";
import { isAdminEmail } from "@/lib/adminStats";

/**
 * 분야/주제를 받아 '바로 글로 쓸 만한' 한국어 블로그 글감 키워드를 추천한다. (로그인 사용자, haiku)
 * "뭘 써야 할지 모르겠어요"를 해결 → 추천 키워드를 누르면 그대로 생성으로 이어진다.
 */
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 아직이에요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  // 출시 전 잠금: 관리자 외 차단
  if (process.env.PRELAUNCH === "true" && !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "아직 오픈 전이에요." }, { status: 403 });
  }

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
  if (!apiKey) return NextResponse.json({ error: "AI 설정이 아직이에요." }, { status: 500 });

  // 현재 연도(한국시간) — 모델이 학습 시점 과거 연도(2024·2025)를 습관적으로 붙이는 것을 막는다
  const year = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCFullYear();

  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content:
            `‘${topic}’ 분야에서 **신규·소규모 블로그도 노려볼 만한, 경쟁이 낮은 롱테일 키워드** 9개를 추천해줘.\n` +
            `핵심 목표: 대형 사이트·언론사가 장악한 광범위한 핵심 키워드(예: "강아지 사료")는 신규 블로그가 못 이긴다. 대신 **구체적인 상황·대상·조건이 붙어 검색량은 적어도 경쟁이 덜한** 롱테일(예: "노령견 신장질환 사료 고르는 법")을 노린다.\n` +
            `규칙: ① 단어 3개 이상, 구체적 상황/대상/조건이 들어간 롱테일 ② 한 단어·광범위 키워드·문장형 금지 ③ 검색 의도를 다양하게(방법·추천·후기·비교·가격·증상·주의점 등) ④ 한국 사람이 실제로 검색할 법한 자연스러운 표현 ⑤ 각 키워드가 바로 글 제목 소재가 되게 ⑥ 연도를 붙일 경우 반드시 올해(${year}년)를 쓴다. 지난 연도(2024·2025 등)는 절대 쓰지 않는다(없어도 됨).\n` +
            `출력은 JSON 배열만. 예: [\"소형견 분리불안 혼자 두는 시간 늘리는 법\",\"노령견 신장질환 사료 고르는 기준\",\"강아지 슬개골 탈구 초기 증상과 집에서 확인하는 법\"]`,
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
