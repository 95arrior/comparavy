import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rateLimit";
import { isAdminEmail } from "@/lib/adminStats";
import { looksLikeGarbageKeyword } from "@/lib/keywordGuard";
import { fetchRelatedKeywords, fetchKeywordStats, buildStatsPool, hasNaverAdEnv, normalizeKey } from "@/lib/naverKeyword";
import { filterAndScore, reconstructKeywords, scoreValidated, type GoldenKeyword } from "@/lib/goldenKeyword";
import { logUsage } from "@/lib/usageLog";

export const maxDuration = 60;

// AI 재구성에 넣을 시드(재료 단어) 상한
const SEED_LIMIT = 60;
// 최종 추천 개수
const RESULT_LIMIT = 30;

/**
 * 황금 키워드 발굴 — B 구조 (추천까지만, 글 생성 연결 X).
 * 주제 1개 → 네이버 시드 → AI 재구성(정보형 롱테일 구) → 네이버 재검증 → 스위트스팟 스코어 → 상위 30개.
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

  // 1) 네이버 시드 수집
  let related;
  try {
    related = await fetchRelatedKeywords(topic);
  } catch (err) {
    const message = err instanceof Error ? err.message : "네이버 키워드 조회에 실패했어요.";
    return NextResponse.json({ error: `키워드를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.`, detail: message }, { status: 502 });
  }

  // 2) 시드 정제(거래형·저검색·고경쟁 제거) → AI 재료(상위 단어)
  const scored = filterAndScore(related);
  const seeds = scored.slice(0, SEED_LIMIT).map((s) => s.keyword);

  // 3) AI 재구성(haiku 1회): 단어 → 정보형 롱테일 구
  const { phrases, usage, usedAi } = await reconstructKeywords(topic, seeds);
  if (usage) {
    void logUsage({
      userId: user.id,
      model: "claude-haiku-4-5",
      kind: "keyword_discover",
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    });
  }

  // 4) 재검증(하이브리드) + 5) 스위트스팟 스코어
  // 1단계 연관키워드(related)에 이미 검색량이 있으니 무료 풀로 먼저 대조. AI 구 + 그 '핵심(2단어)'까지
  // 풀에 없는 것만 네이버 재조회(429 방어). 핵심이 검증되면 자연 질문형도 살린다.
  let keywords: GoldenKeyword[] = [];
  if (phrases.length > 0) {
    const pool = buildStatsPool(related);
    // 정확 구는 AI-신조라 네이버에 거의 없음 → 재조회 낭비. 검증의 핵심인 '2단어 핵심'만 재조회한다.
    // (정확 일치는 무료 pool0에 있으면 그대로 사용)
    const heads = new Set<string>();
    for (const p of phrases) heads.add(p.trim().split(/\s+/).slice(0, 2).join(" "));
    const missing = Array.from(heads).filter((q) => q && !pool.has(normalizeKey(q)));
    if (missing.length > 0) {
      const extra = await fetchKeywordStats(missing);
      for (const [k, v] of extra) if (!pool.has(k)) pool.set(k, v);
    }
    keywords = scoreValidated(phrases, pool, 300, 500, RESULT_LIMIT);
    // 회복: 너무 적으면 문턱을 낮춰 더 살린다
    if (keywords.length < 15) {
      keywords = scoreValidated(phrases, pool, 150, 300, RESULT_LIMIT);
    }
  }

  // 6) 폴백: AI가 아예 안 돌았을 때만(키 없음·오류) 정제 시드 단어로 채운다.
  //    AI가 성공했으면 검증 통과한 '진짜 구'만 보여준다(단어 도배 방지 — 적게 나와도 단어보단 낫다).
  if (!usedAi && keywords.length < RESULT_LIMIT) {
    const seen = new Set(keywords.map((k) => normalizeKey(k.keyword)));
    for (const s of scored) {
      const nk = normalizeKey(s.keyword);
      if (seen.has(nk)) continue;
      seen.add(nk);
      keywords.push({ keyword: s.keyword, monthlyMobileQcCnt: s.monthlyMobileQcCnt, compIdx: s.compIdx, highVolume: s.highVolume, estimated: false });
      if (keywords.length >= RESULT_LIMIT) break;
    }
  }

  return NextResponse.json({ topic, keywords, total: related.length, aiReconstructed: usedAi });
}
