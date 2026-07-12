// ★구글(WP) 글감 전략 — 신생 도메인 정석: 숏테일(뉴스·트렌드) 포기, 롱테일 질문형 에버그린 + 고단가 올인.
//  차별 무기: 네이버 수요 데이터(keyword_pool 실검색량) × 구글 자동완성 교차 검증 — 두 판 모두 수요가 확인된 키워드만.
import { finalGate, adsenseUnsafe } from "./cardFinalGate";
import { createSupabaseAdminClient } from "./supabase-server";
import { isUnsafeKeyword } from "./keywordSafety";

/** 구글 자동완성(비공식·안정) — oe/ie 지정 필수(기본 EUC-KR로 깨짐). 실패 시 빈 배열. */
export async function googleSuggest(q: string): Promise<string[]> {
  try {
    const r = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&hl=ko&ie=utf-8&oe=utf-8&q=${encodeURIComponent(q)}`, { headers: { "user-agent": "Mozilla/5.0" } });
    const j = (await r.json()) as [string, string[]];
    return Array.isArray(j?.[1]) ? j[1].slice(0, 10) : [];
  } catch { return []; }
}

// 에버그린 판별 — 연도·시즌·뉴스성 신호가 있으면 제외(구글 신생 도메인은 시의성 싸움에서 못 이긴다)
const TIMELY_RE = /20\d{2}|이번\s?(주|달)|오늘|최신|속보|발표|출시\s?예정|마감|d-\d/i;
export function isEvergreenKeyword(kw: string): boolean {
  return !TIMELY_RE.test(kw) && !isUnsafeKeyword(kw);
}

export interface WpTopicPick { keyword: string; monthly: number; adDepth: number | null; suggests?: string[] }

/**
 * WP 자동 발행용 글감 1개 — keyword_pool(활성 블로그 sub)에서:
 * 미사용(계정 전체 키워드 대조·채널 배타 자동) + 에버그린 + 경쟁 낮음/중간 + ad_depth(단가) 내림차순
 * → 상위 후보를 구글 자동완성으로 교차 검증(서제스트에 등장 = 구글에도 수요) → 첫 통과 채택.
 */
export async function pickWpTopic(userId: string, sub: string): Promise<WpTopicPick | null> {
  const db = createSupabaseAdminClient();
  const { data: mine } = await db.from("articles").select("keyword").eq("user_id", userId);
  const used = new Set((mine ?? []).map((a) => String(a.keyword ?? "").replace(/\s+/g, "").toLowerCase()).filter(Boolean));
  const { data: pool } = await db.from("keyword_pool")
    .select("keyword, monthly_searches, competition, ad_depth")
    .eq("vertical", "online").eq("sub", sub)
    .gte("monthly_searches", 300) // 너무 얇은 롱테일 제외(구글+네이버 양쪽 수요 하한)
    .neq("competition", "높음")
    .order("ad_depth", { ascending: false, nullsFirst: false })
    .limit(60);
  // ★중앙 관문 + 애드센스 게이트(2026-07-12) — WP 글감도 무검문 금지: 지역 협소·민감·B2B·뉴스성 + 광고 정책 부적합 컷
  const gated = finalGate((pool ?? []).map((r) => ({ keyword: String(r.keyword), title: String(r.keyword), row: r })));
  const cands = gated.pass
    .filter((x) => !adsenseUnsafe(x.keyword))
    .map((x) => x.row)
    .filter((r) => !used.has(String(r.keyword).replace(/\s+/g, "").toLowerCase()))
    .filter((r) => isEvergreenKeyword(String(r.keyword)));
  for (const c of cands.slice(0, 12)) { // 서제스트 예의 — 최대 12콜
    const sug = await googleSuggest(String(c.keyword).slice(0, 20));
    const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();
    const hit = sug.some((s2) => norm(s2).includes(norm(String(c.keyword)).slice(0, 6)));
    if (hit) return { keyword: String(c.keyword), monthly: Number(c.monthly_searches ?? 0), adDepth: c.ad_depth === null ? null : Number(c.ad_depth), suggests: sug.filter((x) => x && x !== String(c.keyword)).slice(0, 6) }; // ★파생 키워드(외부 리뷰 반영) — 본문 자연 배치용
    await new Promise((r) => setTimeout(r, 300));
  }
  return cands.length ? { keyword: String(cands[0].keyword), monthly: Number(cands[0].monthly_searches ?? 0), adDepth: cands[0].ad_depth === null ? null : Number(cands[0].ad_depth) } : null; // 교차 검증 전멸 시 폴백(수요 데이터는 이미 확인됨)
}
