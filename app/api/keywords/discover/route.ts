import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rateLimit";
import { isAdminEmail } from "@/lib/adminStats";
import { looksLikeGarbageKeyword } from "@/lib/keywordGuard";
import { fetchRelatedKeywords, hasNaverAdEnv } from "@/lib/naverKeyword";
import { filterAndScore, classifyInformational, type GoldenKeyword } from "@/lib/goldenKeyword";
import { logUsage } from "@/lib/usageLog";

export const maxDuration = 60;

// 필터1·2로 줄인 뒤 AI 판별에 보낼 후보 상한 (비용 통제 — 1,000개 전부 안 보냄)
const MAX_FOR_AI = 40;
// 최종 추천 개수
const RESULT_LIMIT = 30;

/**
 * 황금 키워드 발굴 (1단계 — 추천까지만, 글 생성 연결 X).
 * 주제 1개 → 네이버 연관키워드 → 필터1·2(검색량·경쟁도)+스코어 → AI 필터3·4(의도·일관성) → 상위 30개.
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

  // 출시 전 잠금: 관리자 외 차단 (기존 라우트와 동일)
  if (process.env.PRELAUNCH === "true" && !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "아직 오픈 전이에요." }, { status: 403 });
  }

  // 버스트(연타) 방지 — 5분당 5회. 네이버·AI 호출 비용 방어.
  const rl = await checkRateLimit(supabase, user.id, "keyword_discover", 5, 300);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `요청이 너무 잦아요. ${rl.retryAfterSec ?? 60}초 후 다시 시도해 주세요.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } },
    );
  }

  if (!hasNaverAdEnv()) {
    return NextResponse.json({ error: "네이버 키워드 연동이 아직 설정되지 않았어요." }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const topic = (typeof body.topic === "string" ? body.topic : "").trim().slice(0, 60);
  if (!topic) return NextResponse.json({ error: "주제 키워드를 입력해 주세요. (예: 강아지)" }, { status: 400 });
  if (looksLikeGarbageKeyword(topic)) {
    return NextResponse.json({ error: "검색할 만한 주제를 입력해 주세요. (예: 강아지, 재테크)" }, { status: 400 });
  }

  // 1) 네이버 연관키워드
  let related;
  try {
    related = await fetchRelatedKeywords(topic);
  } catch (err) {
    const message = err instanceof Error ? err.message : "네이버 키워드 조회에 실패했어요.";
    return NextResponse.json({ error: `키워드를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.`, detail: message }, { status: 502 });
  }

  // 2) 필터1(검색량)·필터2(경쟁도) + 스코어 정렬
  const scored = filterAndScore(related);
  if (scored.length === 0) {
    return NextResponse.json({ topic, keywords: [], total: related.length });
  }

  // 3) AI 필터3·4(의도·일관성) — 상위 후보만 배치 1회
  const forAi = scored.slice(0, MAX_FOR_AI);
  const { keep, usage, usedAi } = await classifyInformational(
    topic,
    forAi.map((k) => k.keyword),
  );
  if (usage) {
    void logUsage({
      userId: user.id,
      model: "claude-haiku-4-5",
      kind: "keyword_discover",
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    });
  }

  // 4) 통과 키워드를 점수순(forAi 순서) 유지하며 상위 30개
  const keywords: GoldenKeyword[] = forAi
    .filter((k) => keep.has(k.keyword))
    .slice(0, RESULT_LIMIT)
    .map((k) => ({
      keyword: k.keyword,
      monthlyMobileQcCnt: k.monthlyMobileQcCnt,
      compIdx: k.compIdx,
      highVolume: k.highVolume,
    }));

  return NextResponse.json({ topic, keywords, total: related.length, aiFiltered: usedAi });
}
