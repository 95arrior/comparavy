// ★구글(WP) 글감 전략 — 신생 도메인 정석: 숏테일(뉴스·트렌드) 포기, 롱테일 질문형 에버그린 + 고단가 올인.
//  차별 무기: 네이버 수요 데이터(keyword_pool 실검색량) × 구글 자동완성 교차 검증 — 두 판 모두 수요가 확인된 키워드만.
import { finalGate, adsenseUnsafe } from "./cardFinalGate";
import { createSupabaseAdminClient } from "./supabase-server";
import { isUnsafeKeyword } from "./keywordSafety";
import { siblingKeywords, maxSimilarity } from "./diversity";

/** 다양성 판정에 쓰는 '최근' 창 — 하루 상한이 10편이라 10편이면 대략 오늘치가 덮인다. */
const RECENT_WINDOW = 10;

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
 * 미사용(계정 전체 키워드 대조) + 형제 글감 제외 + 에버그린 + 경쟁 낮음/중간 + ad_depth(단가) 상위 60
 * → 최근 10편과 덜 닮은 순(같은 묶음 안에선 단가 순)으로 훑으며 구글 자동완성 교차 검증 → 첫 통과 채택.
 * ★'채널 배타'는 여기 없다 — keyword_pool에는 channel 컬럼이 없고(0035), 네이버와 같은 (vertical, sub)
 *  풀을 공유한다. 실제 배타는 '이미 쓴 키워드 제외'라는 사후 상호배제뿐이다. 주석이 없는 걸 있다고 말하지 않는다.
 */
export async function pickWpTopic(userId: string, sub: string): Promise<WpTopicPick | null> {
  const db = createSupabaseAdminClient();
  // ★최신순으로 읽는다 — 전체는 '이미 쓴 것' 대조에, 앞쪽 10편은 '지금 뭘 밀고 있나'(다양성) 판정에 쓴다.
  const { data: mine } = await db.from("articles").select("keyword, created_at").eq("user_id", userId)
    .order("created_at", { ascending: false });
  const mineKw = (mine ?? []).map((a) => String(a.keyword ?? "")).filter(Boolean);
  const used = new Set(mineKw.map((k) => k.replace(/\s+/g, "").toLowerCase()));
  const recent = mineKw.slice(0, RECENT_WINDOW);
  const { data: pool } = await db.from("keyword_pool")
    .select("keyword, monthly_searches, competition, ad_depth")
    .eq("vertical", "online").eq("sub", sub)
    .gte("monthly_searches", 300) // 너무 얇은 롱테일 제외(구글+네이버 양쪽 수요 하한)
    .neq("competition", "높음")
    .order("ad_depth", { ascending: false, nullsFirst: false })
    .limit(60);
  // ★중앙 관문 + 애드센스 게이트(2026-07-12) — WP 글감도 무검문 금지: 지역 협소·민감·B2B·뉴스성 + 광고 정책 부적합 컷
  const gated = finalGate((pool ?? []).map((r) => ({ keyword: String(r.keyword), title: String(r.keyword), row: r })));
  // ★유사 키워드 제외(실측 2026-07-13: '증권수수료 비교' 발행 직후 '증권수수료'가 재선정 — 완전 일치만 보던 구멍).
  //  발행 키워드와 포함 관계(6자+)면 같은 주제로 간주해 제외 — 같은 주제 글 2개는 서로 노출을 잠식한다.
  const usedList = [...used].filter((u) => u.length >= 6);
  const similarToUsed = (kw: string) => {
    const nk = kw.replace(/\s+/g, "").toLowerCase();
    return used.has(nk) || usedList.some((u) => nk.includes(u) || u.includes(nk));
  };
  // ★형제 글감 차단(2026-08-02 유저 제보: '중국주식 …5가지' 옆에 '일본주식 …5가지').
  //  위 포함검사는 이 쌍을 구조적으로 못 잡는다 — '중국주식'·'일본주식'은 4자라 6자 문턱에서 usedList에
  //  들어가지도 못하고, 설사 들어가도 서로 포함 관계가 아니다. 꼬리가 같고 머리만 다른 형제는 별도 축이다.
  const siblingOfRecent = (kw: string) => recent.some((r) => siblingKeywords(kw, r));
  const cands = gated.pass
    .filter((x) => !adsenseUnsafe(x.keyword))
    .map((x) => x.row)
    .filter((r) => !similarToUsed(String(r.keyword)))
    .filter((r) => !siblingOfRecent(String(r.keyword)))
    .filter((r) => isEvergreenKeyword(String(r.keyword)))
    // ★한 축 쏠림 해소(같은 제보) — 종전 순서는 ad_depth 내림차순 '단 하나'였다. 재테크 서브에서 광고 단가가
    //  가장 깊은 건 증권·해외주식 계열이라, 매번 그 top을 위에서부터 긁어 보드가 주식으로 덮였다.
    //  ★단가 축을 버리지는 않는다 — 최근 글과 덜 닮은 것부터 보되, 같은 묶음 안에서는 여전히 단가가 높은 순.
    //   유사도를 0.1 단위로 뭉개는 이유: 소수점 그대로 쓰면 모든 후보가 제각각이라 ad_depth 순서가 통째로 무너진다.
    .sort((a, b) => Math.round(maxSimilarity(String(a.keyword), recent) * 10)
      - Math.round(maxSimilarity(String(b.keyword), recent) * 10));
  for (const c of cands.slice(0, 12)) { // 서제스트 예의 — 최대 12콜
    const sug = await googleSuggest(String(c.keyword).slice(0, 20));
    const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();
    const hit = sug.some((s2) => norm(s2).includes(norm(String(c.keyword)).slice(0, 6)));
    if (hit) return { keyword: String(c.keyword), monthly: Number(c.monthly_searches ?? 0), adDepth: c.ad_depth === null ? null : Number(c.ad_depth), suggests: sug.filter((x) => x && x !== String(c.keyword)).slice(0, 6) }; // ★파생 키워드(외부 리뷰 반영) — 본문 자연 배치용
    await new Promise((r) => setTimeout(r, 300));
  }
  return cands.length ? { keyword: String(cands[0].keyword), monthly: Number(cands[0].monthly_searches ?? 0), adDepth: cands[0].ad_depth === null ? null : Number(cands[0].ad_depth) } : null; // 교차 검증 전멸 시 폴백(수요 데이터는 이미 확인됨)
}
