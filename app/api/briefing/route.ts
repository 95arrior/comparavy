import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rateLimit";
import { isAdminEmail } from "@/lib/adminStats";
import { parseAnswerSheet, daysSeenIn } from "@/lib/answerSheet";
import { fetchBlogTotalDetailed } from "@/lib/naverBlogSearch";
import { isUnsafeKeyword, financeBrandAllowed } from "@/lib/keywordSafety";
import { DOC_HARD_MAX } from "@/lib/topicScore";

export const maxDuration = 60;

/**
 * ★아침 브리핑(답안지 레인 1단계, 2026-08-10) — docs/answer-sheet-lane.md
 * 크리에이터 어드바이저 '인기유입검색어' 붙여넣기 → 검색어 추출 → 연속성(며칠째) → 문서수 즉석 측정 → 직행/변형 판정.
 * 어드바이저는 네이버 로그인 세션이 필요해 서버가 직접 못 긁는다(세션 저장 = 계정 리스크) — 붙여넣기가 1단계다.
 * 기존 글감 파이프(topics)와 완전 분리된 추가 레인 — 8/5 동결 관측을 오염시키지 않는다.
 */
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 아직이에요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (process.env.PRELAUNCH === "true" && !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "아직 오픈 전이에요." }, { status: 403 });
  }
  const rl = await checkRateLimit(supabase, user.id, "briefing", 6, 300);
  if (!rl.ok) {
    return NextResponse.json({ error: `분석이 너무 잦아요. ${rl.retryAfterSec ?? 60}초 후 다시 시도해 주세요.` }, { status: 429 });
  }

  let body: { text?: string; history?: { date: string; keywords: string[] }[] };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "요청이 올바르지 않아요." }, { status: 400 });
  }
  const { keywords, droppedNewsy } = parseAnswerSheet(body.text ?? "");
  if (keywords.length === 0) {
    return NextResponse.json({ error: "검색어를 못 찾았어요. 통계 화면을 전체 선택해서 그대로 붙여넣어 주세요." }, { status: 400 });
  }
  const history = Array.isArray(body.history) ? body.history.slice(0, 7) : [];

  // 금융 브랜드 허용 여부는 분야로 갈린다(2026-08-05 원칙 — generate와 동일 기준).
  const { data: profileRow } = await supabase
    .from("blog_profiles").select("vertical,sub_category")
    .eq("user_id", user.id).eq("is_active", true).maybeSingle();
  const brandOk = { allowFinanceBrand: financeBrandAllowed(`${profileRow?.vertical ?? ""} ${profileRow?.sub_category ?? ""}`) };

  type Item = { keyword: string; days: number; docs: number | null; verdict: "direct" | "variant" | "unmeasured" | "blocked"; reason?: string };
  const items: Item[] = [];
  const startedAt = Date.now();
  const TIME_BUDGET_MS = 45_000; // maxDuration 60s에서 응답 몫을 뺀 측정 예산
  let measured = 0;
  let backedOff = false; // 429를 만나면 남은 건 미측정으로 두고 물러선다(호출 과다 악화 금지)

  for (const kw of keywords) {
    const days = daysSeenIn(kw, history) + 1; // 오늘 포함 N일째
    if (isUnsafeKeyword(kw, brandOk)) {
      items.push({ keyword: kw, days, docs: null, verdict: "blocked", reason: "업체명·가십·상품명 차단" });
      continue;
    }
    if (backedOff || measured >= 20 || Date.now() - startedAt > TIME_BUDGET_MS) {
      items.push({ keyword: kw, days, docs: null, verdict: "unmeasured" });
      continue;
    }
    const r = await fetchBlogTotalDetailed(kw);
    measured += 1;
    if (r.status === 429) backedOff = true;
    if (r.total == null) {
      items.push({ keyword: kw, days, docs: null, verdict: "unmeasured", reason: r.reason ?? undefined });
    } else if (r.total < DOC_HARD_MAX) {
      items.push({ keyword: kw, days, docs: r.total, verdict: "direct" });
    } else {
      items.push({ keyword: kw, days, docs: r.total, verdict: "variant" });
    }
    await new Promise((res) => setTimeout(res, 120));
  }

  // 직행(문서 적은 순) → 변형 → 미측정 → 차단. 어드바이저 순서는 유입순이라 동률이면 원래 순서 유지(stable sort).
  const rank: Record<Item["verdict"], number> = { direct: 0, variant: 1, unmeasured: 2, blocked: 3 };
  items.sort((a, b) => rank[a.verdict] - rank[b.verdict] || (a.docs ?? Infinity) - (b.docs ?? Infinity));

  return NextResponse.json({ items, parsedKeywords: keywords, droppedNewsy, docMax: DOC_HARD_MAX });
}
