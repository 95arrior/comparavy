import { titleSimilarity } from "@/lib/naverRss";
import { NextResponse, after } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { keywordsToTitles } from "@/lib/topicTitles";
import { lastAmplifyDiag } from "@/lib/amplifyTopics";
import { validateTitleTail } from "@/lib/titleRules";
import { normalizeKeyword, nearDuplicate, sameProductFamily } from "@/lib/diversity";
import { audienceOf, AUDIENCE_ALL } from "@/lib/audience";
import { isUnsafeKeyword, mentionsForeignRegion } from "@/lib/keywordSafety";
import { regionLevel, buildLocalSeeds, addressRegionTiers } from "@/lib/region";
import { bloggerType, type BloggerType } from "@/lib/bloggerTypes";
import { compFromLabel, compFromBlogTotal, filledStarsFromData, applyDocCut, DOC_HARD_MAX, type Comp } from "@/lib/topicScore";
import { fetchBlogTotal, fetchBlogTotalDetailed } from "@/lib/naverBlogSearch";
import { resolveLocalPlan, generateLocalKeywords, generateAudienceTopics, type LocalScope } from "@/lib/aiSeeds";
import { buildPoolForSub } from "@/lib/keywordPool";
import { getTrendTopics, refreshCategoryTrends, hasFreshTrends } from "@/lib/trendTopics";
import { amplifyForUser } from "@/lib/amplifyTopics";
import { fetchKeywordStats, normalizeKey, fetchRelatedKeywords } from "@/lib/naverKeyword";
import { poolScore, isBigPool } from "@/lib/trafficPool";
import { finalGate, ANSWER_LOCKED_RE, EXPERIENCE_RE, AI_BRIEF_ENDED_RE, weekendAdjust, staleForRising, RISING_STALE_MAX } from "@/lib/cardFinalGate";
import { pickHomefeedBets, lastHomebetDiag } from "@/lib/homefeedBet";
import { collectPoolKeywords } from "@/lib/poolCollect";
import { fetchNaverAutocomplete } from "@/lib/naverAutocomplete";
import { checkRateLimit } from "@/lib/rateLimit";
import { BID_WEIGHT, BID_DEPTH_CAP, BID_COMP_BONUS, BID_BADGE_RATIO, BID_HIGH_MIN_DEPTH, ATTACK } from "@/lib/scoreWeights";
import { FF } from "@/config/featureFlags";
import { getPerfWeights } from "@/lib/perfWeights";
import { dwellPotential } from "@/lib/dwellScore";
import { revenuePathOf, REVENUE_TAG_LABEL, type RevenuePath } from "@/lib/revenuePath";
import { computeBlogTier, applyDemoteGuard, coldStartTier, type TierResult, type BlogTier } from "@/lib/blogTier";
import { TIER_BANDS, dayQuota, columnQuota, COLUMN_SIZE, SEED_CLAIM_CAP, SEED_CLAIM_WINDOW_H } from "@/lib/scoreWeights";
// 하루 보드 슬롯 수 — 배합의 분모. 화면은 2열 × 5장(Home.tsx의 활성 슬라이스)이라 10 = 하루 10편과 일치한다.
const DAILY_BOARD = 10;
const PER_COLUMN = DAILY_BOARD / 2;
import { revenuePath } from "@/lib/revenue";
import { logUsage } from "@/lib/usageLog";
import { isAdminEmail } from "@/lib/adminStats";

// 사장의 blog_profile(vertical + sub_category)로 keyword_pool에서 글감 3개를 뽑는다.
// Stage 2-B 분산: ① least-used 우선(times_assigned asc) ② 본인이 이미 쓴 키워드 제외 ③ 그 안 랜덤.
export const dynamic = "force-dynamic";
export const maxDuration = 60; // 신규 카테고리 첫 요청은 lazy-fill(네이버 수집)이 요청 안에서 돌아 시간 필요

const PICK = 5; // 홈 5~6개 동적 노출(오늘 1 + 다른 글감 4~5)
const WINDOW = 150; // least-used 윈도우 크기 — 이 안에서 랜덤(반복 많으면 키우고, 마이너 자주 뜨면 줄임)

interface PoolRow { keyword: string; monthly_searches: number | null; competition: string | null; audience: string | null; blog_total: number | null; ad_depth?: number | null }

// 검색량 → 쉬운 말(숫자 노출 X). 유형별 톤: local=손님 / online=검색 / hobby=찾는 주제.
function demandLabel(searches: number | null, type: BloggerType): string {
  const n = searches ?? 0;
  if (type === "online") {
    if (n >= 3000) return "많이 검색되는 주제예요";
    if (n >= 800) return "꾸준히 검색돼요";
    return "지금 쓰기 좋아요";
  }
  if (type === "hobby") {
    if (n >= 3000) return "많이 찾는 주제예요";
    if (n >= 800) return "꾸준히 찾는 주제예요";
    return "지금 쓰기 좋아요";
  }
  if (n >= 3000) return "손님이 많이 찾아요";
  if (n >= 800) return "꾸준히 찾는 주제예요";
  return "지금 쓰기 좋아요";
}

// 하루 단위 고정 추천 — (userId+날짜) 시드로 그날은 새로고침해도 같은 3개.
function seedFrom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rnd: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 고른 대상(specific)별로 골고루 번갈아 n개 뽑는다. 대상 마커 없는 '중립' 키워드는 모자랄 때 채움.
// 대상이 0~1개면(또는 비활성) 그냥 랜덤.
function pickBalanced(rows: PoolRow[], auds: string[], n: number, rnd: () => number = Math.random): PoolRow[] {
  const specific = auds.filter((a) => a !== AUDIENCE_ALL);
  if (specific.length <= 1) return shuffle(rows, rnd).slice(0, n);
  const buckets = new Map<string, PoolRow[]>(specific.map((a) => [a, []]));
  const neutral: PoolRow[] = [];
  for (const r of shuffle(rows, rnd)) {
    const a = r.audience ?? audienceOf(r.keyword);
    if (a && buckets.has(a)) buckets.get(a)!.push(r);
    else neutral.push(r);
  }
  const out: PoolRow[] = [];
  let progress = true;
  while (out.length < n && progress) {
    progress = false;
    for (const a of specific) {
      if (out.length >= n) break;
      const b = buckets.get(a)!;
      if (b.length) { out.push(b.shift()!); progress = true; }
    }
  }
  for (const r of neutral) { if (out.length >= n) break; out.push(r); } // 모자라면 중립으로 채움
  return out.slice(0, n);
}

// 소주제 군집 키 — 비슷한 글감(같은 소주제: 영문법변환기 류) 몰림 방지용.
// 띄어쓰기 무관하게 '앞 4글자(핵심 명사 prefix)'로 묶는다. 수식어 목록(공부법·추천 등) 의존하지 않아 견고.
function clusterKey(kw: string): string {
  const s = kw.replace(/\s+/g, "").replace(/[^가-힣a-z0-9]/gi, "");
  return s.slice(0, 4) || s;
}

// 소주제 골고루 — 클러스터별 라운드로빈으로 n개. 한 소주제에 몰리지 않게(후보 단계부터 분산).
function pickDiverse(rows: PoolRow[], n: number, rnd: () => number = Math.random): PoolRow[] {
  const byC = new Map<string, PoolRow[]>();
  for (const r of shuffle(rows, rnd)) {
    const k = clusterKey(r.keyword);
    const a = byC.get(k);
    if (a) a.push(r); else byC.set(k, [r]);
  }
  const cl = [...byC.values()];
  const out: PoolRow[] = [];
  while (out.length < n && cl.some((c) => c.length)) {
    for (const c of cl) { if (out.length >= n) break; const t = c.shift(); if (t) out.push(t); }
  }
  return out;
}

// ★원천 칸 — 카드가 어느 원천에서 왔는지 한 단어로. 화면·진단이 같은 이름을 쓴다.
//  유저 요청(2026-08-05): "청약홈 칸에 글감이 있고 없고를 알고, 인터넷엔 이슈인데 없으면 바로 캐치"
const SLOT_LABEL: Record<string, string> = {
  calendar: "캘린더", applyhome: "청약", gov24: "정부지원", bizinfo: "기업지원",
  gov: "정부발표", dart: "공시", rising: "실시간", news: "뉴스", season: "시즌", discover: "발굴", homebet: "홈판",
  community: "커뮤니티", pool: "검색풀", series: "시리즈", followup: "후속",
};
// ★칸 판정은 여기 하나뿐이다(2026-08-05 유저 실측: "전체 10인데 실시간 5 뉴스 1").
//  원인은 slot을 '카드 만드는 한 군데'에서만 붙여, 다른 경로로 만든 카드가 어느 칸에도 안 잡힌 것.
//  그래서 서빙 직전에 전 카드를 여기로 통과시킨다 — 붙이는 자와 세는 자가 같아야 숫자가 안 어긋난다.
function slotOf(c: { tag?: string; sel?: unknown; risingSeed?: boolean; seedSource?: string }): string {
  if (c.tag === "홈판") return "홈판";
  const srcEarly = (c.sel as { seedSource?: string } | undefined)?.seedSource ?? c.seedSource ?? "";
  if (srcEarly === "community") return "커뮤니티"; // ★실시간 배지는 달되 칸은 따로 — 원천이 죽은 걸 알아야 한다
  if (c.risingSeed === true) return "실시간";
  if (c.tag === "series") return "시리즈";
  if (c.tag === "followup") return "후속";
  const src = (c.sel as { seedSource?: string } | undefined)?.seedSource ?? c.seedSource ?? "";
  if (src) return SLOT_LABEL[src] ?? src;
  // ★남은 건 키워드 풀에서 온 검색 레인 카드다 — '기타'로 묻으면 칸 합계가 전체와 안 맞는다
  return "검색풀";
}
/** 서빙 직전에 모든 카드에 칸을 찍는다. 이 함수를 거치지 않고 내보내는 응답이 있으면 안 된다. */
function stampSlots<T extends object>(cards: T[]): T[] {
  return cards.map((c) => ({ ...c, slot: slotOf(c) }));
}
function slotCount(cards: object[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const label of Object.values(SLOT_LABEL)) out[label] = 0; // 0인 칸도 보여야 '없다'가 보인다
  for (const c of cards) { const k = slotOf(c as Parameters<typeof slotOf>[0]); out[k] = (out[k] ?? 0) + 1; }
  return out;
}

export async function GET(req: Request) {
  // 인증·프로필은 유저 클라이언트(RLS) — 본인 확인 + 본인 프로필만 읽음.
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const { data: profile } = await supabase
    .from("blog_profiles")
    .select("id, vertical, sub_category, audience, biz_address, target, mix_weights")
    .eq("user_id", user.id).eq("is_active", true)
    .maybeSingle();

  // ★최상급 전용 계정 — 분산 무시, 절대 최상급(경쟁 낮음·검색량 상위)만.
  //  w.95arrior만 적용 → tjdghdlgh는 일반 유저와 동일 로직(비교 테스트용 대조군).
  const adminBest = (user.email ?? "").toLowerCase() === "w.95arrior@gmail.com";

  const vertical = profile?.vertical;
  const sub = profile?.sub_category;
  if (!vertical) return NextResponse.json({ topics: [] }); // 온보딩 전

  // 대상(audience) 필터 — 사장이 고른 대상만. 빈 배열이거나 '전체' 포함이면 필터 없음(현행 동작).
  const audSel: string[] = Array.isArray(profile?.audience) ? (profile!.audience as string[]) : [];
  const audActive = audSel.length > 0 && !audSel.includes(AUDIENCE_ALL);
  // 풀에 분류값(audience)이 있으면 그걸 쓰고, 없으면(stage 1) 키워드 텍스트 휴리스틱으로 판정.
  // 중립(어느 대상 마커도 없음)은 통과시킨다(과도 차단 방지). 선택한 대상에 속하지 않는 것만 제외.
  const audMatch = (kw: string, poolAud: string | null): boolean => {
    if (!audActive) return true;
    const a = poolAud ?? audienceOf(kw);
    return a === null || audSel.includes(a);
  };

  // 본인이 이미 쓴 키워드(정규화 집합) — 제외용. articles는 owner RLS라 유저 클라로 본인 것만.
  const { data: mine } = await supabase.from("articles").select("keyword, title, created_at").eq("user_id", user.id);
  const usedSet = new Set((mine ?? []).map((a) => normalizeKeyword(String(a.keyword ?? ""))).filter(Boolean));
  // ★유사 글감 게이트(실측: 쓴 '중소기업 지원금 총정리'와 거의 같은 증식 변형이 재등장) —
  //  정확 일치를 넘어, 쓴 글 제목·키워드와 bigram 유사하거나 핵심 토큰이 대부분 겹치면 제외.
  // ★유사 차단은 최근 14일만(실측: 58편 누적 시 카테고리 핵심 토큰이 전부 잠겨 씨앗 24→카드 1 고사) — 정확 일치(usedSet)는 전 기간 유지
  const recent14 = (mine ?? []).filter((a) => { const c = (a as { created_at?: string }).created_at; return c ? Date.now() - new Date(c).getTime() < 14 * 86400_000 : true; });
  const usedTexts = recent14.flatMap((a) => [String(a.title ?? ""), String(a.keyword ?? "")]).filter((t) => t.length >= 4);
  const GENERIC_TOK = new Set(["지원금", "지원", "신청", "방법", "정리", "총정리", "조건", "기간", "확인", "세금", "혜택", "정부", "정부지원금", "보조금", "금리", "대출", "연금", "청약", "2025", "2026"]);
  const usedForbidden = (cand: string): boolean => {
    for (const u of usedTexts) {
      if (nearDuplicate(cand, u)) return true; // ★코어 명사 환원 비교 — 'CMA추천' vs 쓴 글 'CMA통장추천'(인픽스 '통장')까지 차단
      if (titleSimilarity(cand, u) >= 0.58) return true; // 0.45는 과차단(실측) — 거의 같은 제목만
      const ct = new Set(cand.replace(/[^가-힣a-z0-9 ]/gi, " ").split(/\s+/).filter((w) => w.length >= 2 && !GENERIC_TOK.has(w)));
      const ut = u.replace(/[^가-힣a-z0-9 ]/gi, " ").split(/\s+/).filter((w) => w.length >= 2 && !GENERIC_TOK.has(w));
      if (ut.length >= 2) { const hit = ut.filter((w) => ct.has(w)).length; if (hit >= 2 && hit / ut.length >= 0.6) return true; }
      // ★고유 제도명이 '양쪽의 핵심어'로 겹치면 같은 주제다(2026-08-04).
      //  발단: '근로장려금 신청 기한'을 쓴 날 '근로장려금, 이 조건 하나 때문'이 또 나왔다(토큰 2개 요구를 통과).
      //  ★그런데 1차 수정("4자 이상 토큰이 하나라도 겹치면 차단")은 과차단이었다 —
      //   발행 이력 121건의 4자+ 토큰 수백 개가 전부 차단선이 되어 보드가 통째로 비었다(유저 실측 served:0).
      //  ★그래서 '핵심어끼리'만 본다: 양쪽에서 가장 긴 토큰이 같을 때만 같은 글감으로 판정한다.
      //   '근로장려금 신청 기한'과 '…근로장려금, 이 조건'은 둘 다 핵심어가 근로장려금 → 차단.
      //   '무직자주택담보대출 기준'과 '전세대출 공제'는 핵심어가 달라 → 통과.
      // ★'핵심어끼리 비교'도 실패했다 — 제목의 서술어가 더 길어서 핵심어를 밀어낸다
      //  ('신청했는데도'(6자) > '근로장려금'(5자)). 그래서 최장어가 아니라 '교집합'을 본다.
      //  ★5자 이상 고유어가 하나라도 겹치면 같은 글감이다. 5자 하한이 일반어를 걸러 준다
      //   (4자로 내리면 '신청기간'·'지원대상' 같은 말이 걸려 과차단이 된다 — 그게 보드를 비웠다).
      const bigToks = (x: string) => x.replace(/[^가-힣a-z0-9 ]/gi, " ").split(/\s+/)
        .filter((w) => [...w].length >= 5 && !GENERIC_TOK.has(w));
      const cs = new Set(bigToks(cand));
      if (cs.size && bigToks(u).some((w) => cs.has(w))) return true;
    }
    return false;
  };
  // 카드별 교체('이 글감 별로예요') — 지금 보이는 글감들을 제외하고 새로 뽑는다.
  const exclude = (new URL(req.url).searchParams.get("exclude") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const attack = new URL(req.url).searchParams.get("attack") === "1";
  // 한계 테스트 트랙(관리자 플래그 계정) — 공격 서빙을 로그로 기록해 안전선 재조정 근거 데이터로.
  if (attack) void logUsage({ userId: user.id, model: "mix", kind: isAdminEmail(user.email) ? "attack_serve_admin" : "attack_serve", inputTokens: 0, outputTokens: 0 }); // ★공격 모드(Part 3) — 배합 오버라이드. Stage 5: blog_profiles.attack_mode로 서버 판정 전환
  const tailMode = new URL(req.url).searchParams.get("mode"); // ★숏/롱테일 전용 요청(유저 제안: 탭=그 순간 그 종족만 왕창)
  const excludeSet = new Set(exclude.map((e) => normalizeKeyword(e))); // 교체로 제외한 것들 — 풀 전멸 시 되살릴 수 있게 분리 보관
  // ★X-ray(관리자 진단) — ?debug=1이면 각 단계 생존 수를 응답에 동봉(실측: 공급 0 원인 추적)
  const debugMode = new URL(req.url).searchParams.get("debug") === "1" && isAdminEmail(user.email);
  const diag: Record<string, unknown> = debugMode ? { vertical, sub, usedSet: usedSet.size, usedTexts: usedTexts.length, exclude: excludeSet.size } : {};
  for (const e of exclude) usedSet.add(normalizeKeyword(e));
  // 토픽 클러스터(주제 이어가기): 이 토큰이 든 키워드만 → 한 주제 깊이 파기. %_ 이스케이프.
  const cluster = (new URL(req.url).searchParams.get("cluster") ?? "").trim().replace(/[%_]/g, "").slice(0, 24);

  // ★낡은 연도 글감 차단 — '2024 ○○' 같은 키워드·제목은 그 자체로 구식 신호(신뢰 하락)
  const STALE_YEAR = /20(1[0-9]|2[0-5])/;
  const staleYear = (t: string) => STALE_YEAR.test(t);

  // keyword_pool은 공용 풀(RLS 정책 없음 = 서버 전용). 서비스롤로 읽는다(category_insights와 동일 패턴).
  // 유저별 비밀이 아닌 공용 데이터이고, 조회 조건은 위에서 본인 확인된 프로필 값(vertical/sub)뿐이라 안전.
  const pool = createSupabaseAdminClient();

  // ★새로 받기 논스(regen 라우트가 올림) — 에버그린 하루 고정 시드·증식 캐시 키에 섞여 세트를 강제 교체
  let regenNonce = 0;
  try {
    const { data: rn } = await pool.from("api_cache").select("value").eq("key", `regen:${user.id}`).maybeSingle();
    regenNonce = Number((rn?.value as { n?: number } | null)?.n ?? 0);
  } catch { /* 논스 없으면 0 */ }

  // ★트렌드 씨앗 × 개인화 증식 카드 — 키워드 풀과 독립. 조기 return에서도 트렌드가 나가게 함수로 분리.
  //  existing: 이미 담긴 글감 키워드(정규화) 집합(중복 방지). 온라인 vertical만 대상.
  interface TrendCard { keyword: string; title: string; demandLabel: string; expiresAt?: string | null; ssak: boolean; region: boolean; tone: BloggerType; vol: number; comp: Comp; blogTotal: number | null; tag: string; newsContext?: string; sourceTitle?: string; demandBadge?: string; publishedOn?: string; actionStart?: string | null; actionEnd?: string | null; titleSearch?: string; briefText?: string; hookKey?: string; thumb?: { mainCopy: string; subCopy: string; badge: string }; brief?: unknown; series?: unknown; seriesId?: string; seriesBadge?: string; sel?: Record<string, unknown> }
  async function buildTrendCards(existing: Set<string>): Promise<TrendCard[]> {
    const cards: TrendCard[] = [];
    if (!user) return cards;
    const bt = bloggerType(vertical);
    if (!(bt === "online" && sub && !cluster)) return cards;
    try {
      const kstDay = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
      let trends = await getTrendTopics(sub); // 캐시 키(씨앗 세대) 계산용 — 가벼운 조회라 캐시 앞으로 이동
      // ★유입력 우선(유저 핵심 진단: 뉴스에 나온 것 ≠ 검색하는 것) — 자동완성 실검색 흔적(longtails)이 많은 씨앗부터 증식.
      // ★최근 7일 발행 키워드(유저 확정: 같은 키워드 연속 발행=노출 잠식) — 감점+표시(제외 아님: 후속·시리즈 판단은 유저)
      const recentPub = new Set<string>();
      const pubDateByKw = new Map<string, string>(); // 정규화 키워드 → 발행 근사일(direct=확정 시각·rss=생성일)
      try {
        const { data: rp } = await pool.from("articles").select("keyword, verified_at, verified_via, created_at").eq("user_id", user.id)
          .in("status", ["verified", "published", "copied"]).gte("created_at", new Date(Date.now() - 7 * 86400_000).toISOString()).limit(60); // copied 포함 — 복사(발행 진행) 후 주소 확정 전 몇 시간 동안 카드가 활성 잔존하던 실측
        for (const r of rp ?? []) {
          const k = String(r.keyword ?? "").replace(/\s+/g, "");
          if (!k) continue;
          recentPub.add(k);
          const basis = (r as { verified_via?: string | null }).verified_via === "direct" ? r.verified_at : ((r as { created_at?: string }).created_at ?? r.verified_at);
          if (basis && !pubDateByKw.has(k)) pubDateByKw.set(k, String(basis));
        }
      } catch { /* ignore */ }
      const isRecentDup = (kw: string) => { const n = kw.replace(/\s+/g, ""); return n.length > 0 && (recentPub.has(n) || [...recentPub].some((r) => r.length >= 4 && (n.includes(r) || r.includes(n)))); };

      // ★청약홈 공고 씨앗 — 증식(LLM) 우회 직접 카드화: 제목·날짜가 전부 API 실값이라 변형 금지(유저 신뢰 원칙)
      const announceSeeds = trends.filter((t) => (t as { actionEnd?: string | null }).actionEnd);
      trends = trends.filter((t) => !(t as { actionEnd?: string | null }).actionEnd);
      for (const a of announceSeeds.slice(0, 3)) {
        if (existing.has(a.keyword)) continue;
        const srcName = ({ applyhome: "청약홈 공고", gov24: "보조금24 실데이터", bizinfo: "기업마당 공고" } as Record<string, string>)[(a as { source?: string }).source ?? ""] ?? "공공 실데이터";
        cards.push({
          keyword: a.keyword, title: a.title, expiresAt: a.expiresAt ?? null,
          demandLabel: `${srcName} · 실공고 데이터`, ssak: true, region: false, tone: bt,
          vol: 0, comp: "low" as Comp, blogTotal: null, tag: "trend",
          newsContext: a.newsContext ?? undefined, sourceTitle: `${srcName}: ${a.title}`,
          actionStart: (a as { actionStart?: string | null }).actionStart ?? null,
          actionEnd: (a as { actionEnd?: string | null }).actionEnd ?? null,
          // ★성과 루프(FF_PERF_LOOP) — 선별 맥락을 카드에 실어 발행 스냅샷까지 운반
          ...(FF.perfLoop ? { sel: { species: "trend", seedSource: (a as { source?: string }).source ?? "announce" } } : {}),
        });
      }

      // ★돈+행동 스코어(유저 승인 — 무순위 청약 28.7만 실증 구조: 돈 걸림+반복 검색+행동 창): 신청·접수형 가점, 뉴스성(기소·실적) 감점
      const actionScore = (t: { title?: string; keyword?: string }) => {
        const txt = `${t.title ?? ""} ${t.keyword ?? ""}`;
        let sc = 0;
        if (/(신청|접수|마감|선착순|추첨|무순위|모집|공고|환급)/.test(txt)) sc += 2;
        if (/([0-9,.]+\s?(만\s?원|억|%)|지원금|보조금|장려금|바우처)/.test(txt)) sc += 1;
        if (/(기소|구속|재판|실적|영업이익|전망|주가|급락|급등|논란|의혹|사과)/.test(txt)) sc -= 2;
        if (/(최종 선정|선정 완료|수상|시상|성료|협약|아카데미|특강|강좌)/.test(txt)) sc -= 5; // 죽은 공고·초지역 행사 — 사실상 바닥
        if (isRecentDup(t.keyword ?? "")) sc -= 3; // 최근 발행 키워드 — 노출 잠식 방지
        sc += Math.round(poolScore(txt) / 2); // 잠재 풀 가점(0~4) — 전 국민 주제·인기지가 위로
        return sc;
      };
      // ★체류 프록시(FF_DWELL_SCORE §3) — 별도 가산 항목(기존 actionScore 무수정). OFF=0.
      const dwellOf = (t: { title?: string; keyword?: string }) => (FF.dwellScore ? dwellPotential(`${t.title ?? ""} ${t.keyword ?? ""}`) : 0);
      trends = [...trends].sort((a, b) => ((b.longtails?.length ?? 0) * 2 + (b.newsContext ? 1 : 0) + actionScore(b) + dwellOf(b)) - ((a.longtails?.length ?? 0) * 2 + (a.newsContext ? 1 : 0) + actionScore(a) + dwellOf(a)));
      if (tailMode === "short") trends = trends.filter((t) => t.source !== "discover"); // 숏테일 탭 순도 — 꾸준 수요 혼입 제거(실측)
      if (debugMode) diag.trendSeeds = trends.length;
      // ★v6(2026-08-04) — 제목 꼬리 게이트·공식이 증식에 들어갔다. 버전을 안 올리면 캐시된 옛 카드가
      //  그대로 서빙되고 증식 자체가 안 돌아 진단(amp-funnel)도 영영 비어 있다(유저 실측으로 확인).
      //  ★규칙을 바꾸면 캐시 버전을 같이 올린다 — 오늘 홈판(v3)에서 이미 겪은 일이다.
      // ★v7(2026-08-05): 실시간 씨앗 우선 배치 + 카드에 씨앗 키워드 싣기. 옛 캐시는 둘 다 없는 세트라
      //  버전을 안 올리면 화면이 '수확 키워드' 없이 옛 표기(월 검색량)로 남는다.
      const ampKey = `amp:v8:${user.id}:${(profile as { id?: string } | null)?.id ??"solo"}:${kstDay}:${excludeSet.size}:${trends.length}:${tailMode === "short" ? "s" : "n"}:r${regenNonce}`; // short=전용 캐시(증식량 다름) // ★v8=원천 구성 변경(정부 보도자료·커뮤니티 압축·로또 제거) — 옛 세트가 남으면 바뀐 걸 못 본다 // ★v5=씨앗 세대 포함 — 재수확 직후(0→15) 캐시 자동 무효화(실측: 수확해도 옛 세트 서빙) // ★v4=블로그별 격리 — 전환 시 이전 블로그 글감 서빙 사고(실측: 자동차 블로그에 캘리포니아비치) 차단
      let amped: { keyword: string; title: string; titleSearch?: string; newsContext: string | null; sourceTitle?: string | null; briefText?: string; hookKey?: string; thumb?: { mainCopy: string; subCopy: string; badge: string }; brief?: unknown; source?: string }[] = [];
      try {
        const { data: c } = await pool.from("api_cache").select("value, expires_at").eq("key", ampKey).single();
        if (c?.value && (!c.expires_at || new Date(c.expires_at).getTime() > Date.now())) amped = c.value as typeof amped;
      } catch { /* 캐시 미스 */ }
      if (amped.length === 0) {
        if (trends.length < 4) {
          const rl = await checkRateLimit(supabase, user.id, `trend_seed_${sub}`, 3, 900);
          if (rl.ok) { const cat = sub; after(async () => { try { if (!(await hasFreshTrends(cat))) await refreshCategoryTrends(cat); } catch { /* ignore */ } }); }
        }
        if (trends.length > 0) {
          amped = await amplifyForUser(trends, profile ?? null, ((profile as { id?: string } | null)?.id ?? user.id), tailMode === "short" ? 15 : 5); // ★short 탭=증식 15(10명 타겟 — 절약보다 볼륨)(실측: 씨앗 19인데 카드 2 — 증식 상한 5가 병목)
          // ★유입력 2차(글감 레벨) — 증식 키워드를 자동완성 실조회로 확인. 캐시에 박제되므로 비용은 증식 1회당.
          //  정책: 확인=가점+배지, 미확인=중립(신어·급상승 초기가 걸러지면 안 됨). 씨앗 longtails 존재도 '주제 확인'으로 상속.
          if (amped.length > 0) {
            const seedVerified = new Set(trends.filter((t) => (t.longtails?.length ?? 0) > 0).map((t) => normalizeKeyword(t.keyword)));
            await Promise.race([ // ★속도 캡(실측: 새벽 첫 로드 지연) — 2.5초 안에 끝난 만큼만 반영, 나머지는 중립
              Promise.all(amped.map(async (a, i) => {
                await new Promise((r) => setTimeout(r, Math.min(i, 5) * 60));
                try {
                  const hits = await fetchNaverAutocomplete(a.keyword.split(" ").slice(0, 3).join(" "));
                  (a as { inflow?: string }).inflow = hits.length > 0 ? "hit" : seedVerified.size > 0 ? "seed" : "";
                } catch { (a as { inflow?: string }).inflow = ""; }
              })),
              new Promise((r) => setTimeout(r, 2500)),
            ]);
            amped = [...amped].sort((x, y) => ((y as { inflow?: string }).inflow === "hit" ? 1 : 0) - ((x as { inflow?: string }).inflow === "hit" ? 1 : 0)); // 확인분 앞으로(안정 정렬 — 유입력 씨앗순 유지)
          }
          // ★공급 보강(2026-07-15 유저 실측: '지금 뜨는'이 항상 1~2장 — 게이트 사망+새벽 씨앗 부족이 겹침)
          //  게이트를 선적용해 '생존분'만 세고, 5장 미만이면 2차 증식으로 보충한 뒤 생존분을 캐시에 저장한다.
          if (amped.length > 0) {
            const g1 = finalGate(amped as { keyword: string; title: string }[]);
            const passKeys = new Set(g1.pass.map((p) => normalizeKeyword(p.keyword)));
            amped = amped.filter((a) => passKeys.has(normalizeKeyword(a.keyword)));
          }
          if (amped.length > 0 && amped.length < 5 && trends.length > 0) {
            try {
              const more = await amplifyForUser(trends, profile ?? null, ((profile as { id?: string } | null)?.id ?? user.id), 10);
              const g2 = finalGate(more as { keyword: string; title: string }[]);
              const pass2 = new Set(g2.pass.map((p) => normalizeKeyword(p.keyword)));
              const seen = new Set(amped.map((a) => normalizeKeyword(a.keyword)));
              for (const m of more) {
                const nk = normalizeKeyword(m.keyword);
                if (pass2.has(nk) && !seen.has(nk)) { seen.add(nk); amped.push(m); if (amped.length >= 12) break; }
              }
              console.log(`[trend-topup] 2차 증식 보충 후 ${amped.length}장`);
            } catch { /* 보충 실패 — 있는 만큼 서빙 */ }
          }
          if (amped.length > 0) {
            try { await pool.from("api_cache").upsert({ key: ampKey, value: amped, expires_at: new Date(Date.now() + 6 * 3600_000).toISOString(), updated_at: new Date().toISOString() }); } catch { /* ignore */ }
          } else {
            // ★증식 실패 폴백 — 원본 씨앗이라도 유저 시드로 회전해 보여준다(홈 빈 화면 방지).
            // ★2026-08-04 유저 실측: 이 폴백이 조용히 돌고 있었고, 씨앗 제목이 뉴스 헤드라인이라
            //  '…보유세 폭증...내 집 세금은 얼마?'처럼 말줄임표가 그대로 화면에 나왔다.
            //  ★폴백도 제목 규격을 지켜야 한다 — 폴백이 규격을 어기면 규칙이 가장 자주 깨지는 곳이 우리 코드가 된다.
            console.log(`[trend-fallback] user=${user.id.slice(0, 8)} 증식 0장 — 씨앗 원문으로 대체(씨앗 ${trends.length})`);
            amped = [...trends]
              .sort((a, b) => (seedFrom(a.keyword + user!.id) % 997) - (seedFrom(b.keyword + user!.id) % 997))
              .slice(0, 3)
              .map((t) => {
                // 실검증 롱테일(gap 낮은 것) 우선 — 뉴스 티 제거. 없으면 씨앗 keyword.
                const lt = (t.longtails ?? [])[0];
                // 말줄임표는 우리 문장부호로 바꿔서 살린다(뉴스 헤드라인 티를 지운다).
                const fixed = String(t.title ?? "").replace(/(\.\.\.|…)\s*/g, ", ").replace(/\s*,\s*,/g, ",").trim();
                return { keyword: lt?.kw ?? t.keyword, title: validateTitleTail(fixed).ok ? fixed : "", newsContext: t.newsContext, source: t.source };
              })
              .filter((x) => x.title); // 규격 미달은 버린다 — 빈자리가 규격 어긴 카드보다 낫다
          }
        }
      }
      const seedExpiry = trends.map((t) => t.expiresAt).filter(Boolean).sort()[0] ?? null; // 가장 이른 만료 — 보수적 수명
      for (const t of amped) {
        if (cards.length >= (tailMode === "short" ? 15 : 5)) break; // short 탭=트렌드만 10개까지
        const nk = normalizeKeyword(t.keyword);
        if (usedSet.has(nk) || existing.has(nk)) continue;
        if (usedForbidden(`${t.title} ${t.keyword}`)) continue; // 쓴 글과 유사 — 재등장 차단
        const src = (t as { source?: string }).source;
        // ★momentum 배지 분리 — 뉴스/시즌='지금 뜨는 중', 자동완성 발굴='꾸준히 찾는 주제'(뜨는 척 금지)
        const demandLabel = src === "discover" ? "꾸준히 찾는 주제" : "지금 뜨는 중";
        cards.push({ keyword: t.keyword, title: t.title, expiresAt: seedExpiry, demandLabel: (t as { inflow?: string }).inflow === "hit" ? "실검색 확인 · 지금 뜨는 중" : demandLabel, ssak: true, region: false, tone: bt, vol: 0, comp: "low" as Comp, blogTotal: null, tag: src === "discover" ? "steady" : "trend", newsContext: t.newsContext ?? undefined, sourceTitle: (t as { sourceTitle?: string | null }).sourceTitle ?? undefined, titleSearch: (t as { titleSearch?: string }).titleSearch, briefText: (t as { briefText?: string }).briefText, hookKey: (t as { hookKey?: string }).hookKey, thumb: (t as { thumb?: { mainCopy: string; subCopy: string; badge: string } }).thumb, brief: (t as { brief?: unknown }).brief, series: (t as { series?: unknown }).series ?? null,
          // ★급상승 표식은 성과루프 플래그와 무관하게 카드에 직접 단다 — sel(계측용)에만 두면
          //  FF_PERF_LOOP가 꺼지는 순간 실시간 레인이 통째로 죽는다(상관없는 스위치에 목숨을 걸지 않는다).
          ...(src === "rising" || src === "community" ? { risingSeed: true } : {}), // 커뮤니티도 실시간 종족(뒷북 컷·배지 대상)
          // ★slot은 여기서 안 붙인다 — 서빙 직전 stampSlots가 전 카드에 한 번에 찍는다(주인은 하나).
          //  대신 원천만 남긴다: sel(성과루프 플래그)이 꺼져도 칸이 살아 있어야 한다.
          ...({ seedSource: src ?? "news" }),
          // ★씨앗 키워드를 화면까지 올린다(2026-08-05 유저: "어떤 키워드로 생성됐는지 그 키워드만 보여줘")
          ...((t as { seedKeyword?: string }).seedKeyword ? { seedKeyword: (t as { seedKeyword?: string }).seedKeyword } : {}),
          ...(FF.perfLoop ? { sel: (() => { const bf = (t as { brief?: { intent?: string; opening?: string; flow?: string } }).brief; return { species: "trend", seedSource: src ?? "news", sourceTitle: (t as { sourceTitle?: string | null }).sourceTitle ?? null, cluster: clusterKey(t.keyword), hookKey: (t as { hookKey?: string }).hookKey ?? null, structure: bf ? [bf.intent, bf.opening, bf.flow].filter(Boolean).join("|") || null : null }; })() } : {}),
          ...(FF.revenueTag ? (() => { const rp = revenuePathOf({ keyword: t.keyword, title: t.title }); return rp === "none" ? {} : { revenuePath: rp, revenueLabel: REVENUE_TAG_LABEL[rp as Exclude<RevenuePath, "none">] }; })() : {}) });
      }
        for (const c of cards) {
        const norm = c.keyword.replace(/\s+/g, "");
        let pubAt = pubDateByKw.get(norm);
        if (!pubAt) { // ★포함 관계 매칭(실측: 루원시티 — 생성 파이프가 키워드를 다듬어 완전일치 실패) — 6자+ 상호 포함이면 같은 글감
          for (const [k, v] of pubDateByKw) { if (k.length >= 6 && (norm.includes(k) || k.includes(norm))) { pubAt = v; break; } }
        }
        if (pubAt) { // ★발행함 상태(유저 확정: 청약 카드는 접수 마감까지 살아있어 발행 후에도 잔존 — 삭제 대신 상태 전환, 접수일 후속 글 재활용 여지)
          const d = new Date(pubAt);
          (c as { publishedOn?: string }).publishedOn = Number.isNaN(d.getTime()) ? "발행함" : `${d.getMonth() + 1}/${d.getDate()} 발행함`;
        } else if (isRecentDup(c.keyword)) c.demandBadge = "최근 7일 내 발행한 키워드 — 연속 발행은 서로 노출을 잠식해요";
      }
    } catch { /* 트렌드 없이 진행 */ }
    return cards;
  }

  // ★tier 밴드(FF_TIER_BANDS §2) — 성과 실측 기반 단계.
  //  ★콜드스타트 개정(2026-07-15 유저 확정): 순위 데이터 없음 = 판정 불가(null·밴드 무효)가 아니라 신생기 '시작값'.
  //  종전 null 폴백이 신생 블로그에 헤드 키워드를 혼입시킴(돼지통 실측: 수요 5천~8만 글 전부 30위 밖, 유입 주역은 월 300~800 니치).
  let tierInfo: TierResult | null = null;
  const fpDiag: unknown[] = []; // ★계측 수집(2026-07-20)
  let bandUnchecked = 0;
  const leakedAll: { where: string; keyword: string; vol: number }[] = [];
  const writeDiag = async () => { // 응답 직전 1회 await — 서버리스에서 확실히 남긴다
    try {
      await pool.from("api_cache").upsert([
        { key: "diag:fetchpool", value: { at: new Date().toISOString(), calls: fpDiag.slice(0, 8) }, expires_at: new Date(Date.now() + 86400_000).toISOString(), updated_at: new Date().toISOString() },
        { key: "diag:band_leak", value: { at: new Date().toISOString(), items: leakedAll.slice(0, 10), unchecked: bandUnchecked }, expires_at: new Date(Date.now() + 86400_000).toISOString(), updated_at: new Date().toISOString() },
      ]);
    } catch { /* ignore */ }
  };
  async function loadTier(): Promise<TierResult | null> {
    if (!FF.tierBands) return null;
    if (tierInfo) return tierInfo;
    try {
      const key = `blog_tier:${(profile as { id?: string } | null)?.id ?? user!.id}`;
      const { data: c } = await pool.from("api_cache").select("value, expires_at").eq("key", key).maybeSingle();
      const cached = c?.value as (TierResult & { prev?: BlogTier }) | undefined;
      if (cached && new Date(String(c!.expires_at)).getTime() > Date.now()) return cached;
      const fresh = await computeBlogTier(pool, user!.id, (profile as { id?: string } | null)?.id ?? null);
      if (!fresh) return coldStartTier(); // 캐시 없이 즉답 — 첫 스냅샷이 생기면 다음 판정이 실측으로 대체
      const guarded = applyDemoteGuard((cached?.tier as BlogTier | undefined) ?? null, fresh);
      try { await pool.from("api_cache").upsert({ key, value: guarded, expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(), updated_at: new Date().toISOString() }); } catch { /* ignore */ }
      return guarded;
    } catch { return null; /* 판정 실패 = 기존 밴드(§2-1) */ }
  }

  // least-used 우선 윈도우(times_assigned asc → 균등 분산). 본인이 쓴 건 제외 후 남은 것만.
  // 적정범위 = 월 500~5,000 (경쟁 과열·초저검색 회피). sub 없거나 부족하면 단계적으로 넓힌다.
  async function fetchPool(useSub: boolean, ranged: boolean): Promise<PoolRow[]> {
    const COLS = "keyword, monthly_searches, competition, audience, blog_total";
    let q = pool.from("keyword_pool").select(`${COLS}, ad_depth`).eq("vertical", vertical);
    if (useSub && sub) q = q.eq("sub", sub);
    if (cluster) q = q.ilike("keyword", `%${cluster}%`); // 클러스터: 이 토큰 든 키워드만
    // ★tier 밴드 오버라이드(FF_TIER_BANDS) — ★2026-07-20 봉쇄: tierInfo가 어떤 이유로든 null이면 종전엔 밴드가 통째로
    //  빠져 ranged=false 폴백이 '무상한'이 됐다(실측: SEEDLING 계정 보드에 8.8만 헤드 노출 — 사다리 붕괴 재발).
    //  콜드스타트 철학(판정 불가=신생 시작값)을 쿼리까지 내린다: 판정 없음 = SEEDLING 밴드 강제.
    const tb = FF.tierBands ? TIER_BANDS[tierInfo?.tier ?? "SEEDLING"] : null;
    if (tb) {
      // ★폴백 상한(2026-07-15 실측: 신생기 보드에 3,090·4,480 혼입) — 범위 해제 폴백도 밴드 상한의 1.5배까지만(★2026-07-20 실측: 확장기 폴백 3배=9만 — 8.8만 헤드가 보드에 노출, 사다리 무력화).
      //  상한 자체가 없으면 풀이 얇은 날 8만짜리 헤드가 그대로 샌다(밴드 사다리 무력화).
      q = ranged ? q.gte("monthly_searches", tb.volMin).lte("monthly_searches", tb.volMax) : q.gte("monthly_searches", Math.min(1000, tb.volMin)).lte("monthly_searches", (tb.volMax ?? 30000) * 1.5);
      // ★미측정(null)은 여기서 통과시킨다 — 실제 컷은 측정 직후 applyDocCut이 건다(2026-08-04).
      //  종전 주석은 "측정 후 별점이 거른다"였는데, 별점은 정렬 가중치일 뿐 아무것도 거르지 않았다.
      // ★쿼리 상한은 밴드 상한이 아니라 '보충 상한'(DOC_HARD_MAX)으로 연다(2026-08-05 유저 실측에서 검거).
      //  사고: 백필로 문서수가 채워지자 '꾸준한 수요' 열이 통째로 비었다. 신생 밴드 실측 분포는
      //  3,000 미만 3% · 10,000 미만 8% · 3만 이상 81% — 밴드 상한으로 쿼리를 막으면 후보가 3%만 남는다.
      //  ★유저 확정 정책은 '컷 + 자리 남으면 문서수 오름차순 보충(1만 미만)'이었다. 그런데 보충 후보가
      //   쿼리에서 미리 잘려 나가 정책이 반쪽으로만 작동했다 — 컷은 살고 보충은 죽은 상태였다.
      //   상한을 여기서 열고, 실제 판정은 applyDocCut 한 곳에서만 한다(3,000 초과는 자리가 남을 때만).
      if (tb.blogTotalMax != null) q = q.or(`blog_total.is.null,blog_total.lt.${Math.max(tb.blogTotalMax, DOC_HARD_MAX)}`);
    } else if (adminBest) {
      // 최상급 = '이길 수 있는 최상' — 메가 키워드(검색량 무제한)는 문서수도 메가라 제외. 적정 상한을 둔다.
      q = ranged ? q.gte("monthly_searches", 2000).lte("monthly_searches", 30000) : q.gte("monthly_searches", 1000).lte("monthly_searches", 45000); // ★상한 봉쇄(2026-07-20) — 관리자 모드 폴백도 무상한 금지
    } else if (ranged) {
      q = q.gte("monthly_searches", 500).lte("monthly_searches", 5000);
    }
    let { data, error } = await q
      .order(adminBest ? "monthly_searches" : "times_assigned", { ascending: adminBest ? false : true })
      .order("monthly_searches", { ascending: false })
      .limit(WINDOW);
    if (error) { // ad_depth(0052) 미적용 방어 — 컬럼 빼고 재조회
      let q2 = pool.from("keyword_pool").select(COLS).eq("vertical", vertical);
      if (useSub && sub) q2 = q2.eq("sub", sub);
      if (cluster) q2 = q2.ilike("keyword", `%${cluster}%`);
      if (tb) { q2 = ranged ? q2.gte("monthly_searches", tb.volMin).lte("monthly_searches", tb.volMax) : q2.gte("monthly_searches", Math.min(1000, tb.volMin)).lte("monthly_searches", (tb.volMax ?? 30000) * 1.5); if (tb.blogTotalMax != null) q2 = q2.or(`blog_total.is.null,blog_total.lt.${tb.blogTotalMax}`); }
      else if (adminBest) q2 = ranged ? q2.gte("monthly_searches", 2000).lte("monthly_searches", 30000) : q2.gte("monthly_searches", 1000).lte("monthly_searches", 45000);
      else if (ranged) q2 = q2.gte("monthly_searches", 500).lte("monthly_searches", 5000);
      const fb = await q2.order(adminBest ? "monthly_searches" : "times_assigned", { ascending: adminBest ? false : true }).order("monthly_searches", { ascending: false }).limit(WINDOW);
      data = (fb.data ?? []) as unknown as typeof data;
    }
    const rows = (data ?? []) as PoolRow[];
    // ★계측(2026-07-20 누출 추적): 이 호출의 밴드 조건·결과 최대 검색량 수집 — 응답 직전 await 기록(void는 서버리스에서 살해됨)
    fpDiag.push({ useSub, ranged, adminBest, tier: tierInfo?.tier ?? null, band: tb ? { min: tb.volMin, max: tb.volMax } : null, rows: rows.length, maxVol: rows.reduce((m, r) => Math.max(m, r.monthly_searches ?? 0), 0) });
    // 본인 작성분 제외 + 고른 대상(audience)만 통과
    const out = rows.filter((r) => !usedSet.has(normalizeKeyword(r.keyword)) && !usedForbidden(r.keyword) && !isUnsafeKeyword(r.keyword) && !staleYear(r.keyword) && audMatch(r.keyword, r.audience));
    if (debugMode) {
      const c = { raw: rows.length, used: 0, forbidden: 0, unsafe: 0, stale: 0, aud: 0 };
      for (const r of rows) {
        if (usedSet.has(normalizeKeyword(r.keyword))) { c.used++; continue; }
        if (usedForbidden(r.keyword)) { c.forbidden++; continue; }
        if (isUnsafeKeyword(r.keyword)) { c.unsafe++; continue; }
        if (staleYear(r.keyword)) { c.stale++; continue; }
        if (!audMatch(r.keyword, r.audience)) { c.aud++; continue; }
      }
      (diag.poolSteps as unknown[] ?? (diag.poolSteps = [])) && (diag.poolSteps as unknown[]).push({ useSub, ranged, ...c, survived: out.length });
    }
    return out;
  }

  // ★mode=short 조기 반환(실측: 504) — 트렌드만 원하는데 풀·게으른 수집·검색량 조회까지 돌면 60s 초과.
  // ★tier를 short 분기 '앞'에서 읽는다(2026-08-01). 종전엔 :641에서 읽어 short 경로가 통째로 tier를 모른 채
  //  돌았다 — '지금 뜨는' 열에 밴드도 배합도 적용되지 않던 구조적 우회(조사 실측). 캐시 24h라 비용 무증가.
  tierInfo = await loadTier();

  const bandCeil = (FF.tierBands ? TIER_BANDS[tierInfo?.tier ?? "SEEDLING"].volMax : 30000) * 1.5;
  const bandInvariant = <T extends { keyword?: string; vol?: number; demandBadge?: string; tag?: string }>(list: T[], where: string): T[] => {
    const leaked: { where: string; keyword: string; vol: number }[] = [];
    // ★검사 못 한 카드를 '통과'와 구분해 센다(2026-08-01). vol이 0/미상인 카드는 이 검사를 그냥 지나가는데,
    //  종전엔 그게 통과와 구분이 안 돼 밴드 우회가 눈에 안 보였다(트렌드 카드는 전부 vol:0으로 만들어진다).
    //  홈판·헤드는 애초에 검색량 게임이 아니라 면제가 맞고, 그 외 미상 카드는 진짜 사각지대라 진단에 남긴다.
    let unchecked = 0;
    const out = list.filter((c) => {
      const v = Number(c.vol ?? 0);
      const exempt = c.tag === "홈판" || String(c.demandBadge ?? "").includes("헤드 배팅");
      if (v <= 0 && !exempt) unchecked += 1;
      // ★실시간 급상승 우회(2026-07-24 유저 확정 — 2026-08-01 '우회 봉쇄'가 이 예외까지 같이 덮었다).
      //  유저 상시 요구: "지금 뜨는은 실제로 효과 있는 실시간 키워드, 혹은 대형이어도 선점 가능한 것."
      //  ★단 무조건 우회는 8.8만 헤드가 신생 보드에 꽂히던 그 실패로 돌아가는 길이다.
      //   '선점 가능'을 말이 아니라 숫자로 증명한 것만 통과시킨다 — 문서수를 재서 상한 미만일 때만.
      //   측정 못 했으면 우회 없음(모르는 것을 근거로 대형을 들이지 않는다).
      if ((c as { risingPass?: boolean }).risingPass === true) return true;
      if (v > bandCeil && !String(c.demandBadge ?? "").includes("헤드 배팅")) {
        leaked.push({ where, keyword: String(c.keyword ?? ""), vol: v });
        return false;
      }
      return true;
    });
    if (leaked.length) {
      console.error(`[band-invariant] ${where} 누출 ${leaked.length}건 차단`, JSON.stringify(leaked.slice(0, 5)));
      leakedAll.push(...leaked);
    }
    if (unchecked) {
      // 차단이 아니라 계측 — 이 숫자가 크면 밴드가 '통과'시킨 게 아니라 '못 본' 것이다.
      console.log(`[band-invariant] ${where} 검색량 미상 ${unchecked}건(밴드 검사 사각)`);
      bandUnchecked += unchecked;
    }
    return out;
  };

  if (tailMode === "short") {
    // ★신선도 보증(실측: 지식iN 고수는 1시간 전 급상승에 진입 — 우리는 카드가 차 있으면 묵은 수확을 계속 서빙) —
    //  마지막 수확이 2시간 넘었으면 응답과 무관하게 백그라운드 재수확(구글 트렌드 급상승·뉴스 최신분 흡수). 다음 탭에서 신선분.
    try {
      const { data: newest } = await pool.from("trend_topics").select("created_at").eq("category", sub).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const ageMs = newest?.created_at ? Date.now() - new Date(newest.created_at as string).getTime() : Infinity;
      if (ageMs > 2 * 3600_000) {
        const rl = await checkRateLimit(supabase, user.id, `trend_seed_${sub}`, 3, 900);
        if (rl.ok) after(async () => { try { await refreshCategoryTrends(sub); } catch { /* ignore */ } });
        if (debugMode) diag.freshKick = Math.round(ageMs / 60000);
      }
    } catch { /* ignore */ }
    if (debugMode) {
      try { const { data: fsRow } = await pool.from("api_cache").select("value").eq("key", `fresh_stats:${sub}`).maybeSingle(); if (fsRow?.value) diag.freshStats = fsRow.value; } catch { /* ignore */ }
    }
    let tc = await buildTrendCards(new Set());
    // ★트렌드 공급 깔때기(2026-08-02) — 백로그의 "착수 전 trend drops 로그로 컷 지점 실측 먼저"에 대한 답.
    //  '지금 뜨는' 열이 1~2장으로 마르는 일이 반복되는데, 종전엔 어느 마디에서 말랐는지 남는 게 없었다
    //  (finalGate·bandInvariant는 각자 로그를 찍지만 '몇 장이 들어와 몇 장이 남았는지'는 아무도 안 셌다).
    //  컷을 완화하기 전에 먼저 잰다 — 근거 없이 게이트를 열면 저품질 글감이 그대로 보드에 오른다.
    const funnel = { built: tc.length, demandCut: 0, zeroDemand: 0, lowDemand: 0, unlistedAnnounce: 0, afterDemand: 0, afterGate: 0, afterBand: 0 };
    // ★수요 신호(유저 확정: 신선하지만 아무도 안 찾는 씨앗 문제) — 실측 검색량 부착. 폐기 아닌 표시(지자체 틈새=저수요·경쟁공백 가치는 유저 판단)
    if (tc.length > 0) {
      // ★fail-closed(실측 2026-07-11 새벽: 검색량 API 실패 시 catch가 선별 게이트·쿼터까지 통째로 건너뛰어
      //  [경북] 외식서비스·원산지검증이 무검문 통과) — 실패 허용은 '조회'까지만, 게이트는 API 무관하게 항상 실행
      const volMap: Record<string, { vol: number; comp: string; base?: string }> = {};
      try {
        const volKey = `trendvol:${sub}:${tc.map((c) => c.keyword).join("|").slice(0, 180)}`;
        const { data: vc } = await pool.from("api_cache").select("value, expires_at").eq("key", volKey).maybeSingle();
        if (vc?.value && new Date(String(vc.expires_at)).getTime() > Date.now()) Object.assign(volMap, vc.value as typeof volMap);
        else {
          const stats = await fetchKeywordStats(tc.map((c) => c.keyword.split(" ").slice(0, 3).join(" ")), 3);
          for (const c of tc) {
            const exact = stats.get(normalizeKey(c.keyword));
            const head = c.keyword.split(" ").slice(0, 3).join(" ");
            const partial = exact ? null : stats.get(normalizeKey(head));
            const st = exact ?? partial;
            if (st) volMap[c.keyword] = { vol: st.mobile + st.pc, comp: st.compIdx, base: exact ? "" : head }; // base=부분 매치 시 조회 기준어(정확성: 전체 구 검색량이 아님을 명시)
          }
          try { await pool.from("api_cache").upsert({ key: volKey, value: volMap, expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(), updated_at: new Date().toISOString() }); } catch { /* ignore */ }
        }
      } catch { /* 검색량 '조회' 실패 — volMap 빈 채로 진행(아래 게이트는 API 무관하게 항상 실행) */ }
      {
        // ★수요 기반 선별(유저 확정: 표시만 하던 검색량을 선별에 사용 — '수요 낮음'을 최상단에 올리는 자기모순 제거)
        tc = tc.filter((c) => {
          const v = volMap[c.keyword];
          const isAnnounce = Boolean((c as { actionEnd?: string | null }).actionEnd);
          if (!isAnnounce) {
            // ★제로수요 원천 배제(2026-07-15 유저 절대 조건 — 실측: '전기트럭 지원금' 월 0회로 1위 해도 유입 0).
            //  트렌드 골든타임 보호: 미측정(급등 초기라 집계 전)은 뉴스 신선도가 수요 증거라 통과,
            //  측정됐는데 월 100회 미만이면 대형 풀·플랫폼 실측 조회·풀 스코어 구제 없을 때만 컷.
            if (v && v.vol < 100) {
              const ctx0 = `${c.title} ${c.keyword} ${(c.newsContext ?? "").slice(0, 200)}`;
              const pv0 = /플랫폼 조회\s*([\d,]+)회/.exec(c.newsContext ?? "");
              const platformViews0 = pv0 ? Number(pv0[1]!.replace(/,/g, "")) : 0;
              if (platformViews0 < 10_000 && !isBigPool(ctx0) && poolScore(ctx0) < 3) { funnel.zeroDemand++; return false; }
            }
            return true;
          }
          if (v && v.vol < 300) { funnel.lowDemand++; return false; } // 실측 저수요 컷
          // ★미조회 공고 뒷문 봉쇄(실측: [강원] 마케터 양성 — 검색량 DB에 없는 공고명 = 아무도 안 찾음).
          //  단 잠재 풀 큰 공고(동탄 줍줍 — 공고 직후라 미조회)는 풀 스코어로 구제.
          //  플랫폼 실측 조회 1만 회 이상(보조금24·기업마당 newsContext의 '플랫폼 조회 N회')도 실수요 증거로 구제
          //  — 실측: 귀농 주택구입지원(조회 2.2만)이 풀 스코어 0으로 버려지던 구멍
          if (!v) {
            const pv = /플랫폼 조회\s*([\d,]+)회/.exec(c.newsContext ?? "");
            const platformViews = pv ? Number(pv[1]!.replace(/,/g, "")) : 0;
            if (platformViews < 10_000 && poolScore(`${c.title} ${c.keyword} ${(c.newsContext ?? "").slice(0, 200)}`) < 3) { funnel.unlistedAnnounce++; return false; }
          }
          return true;
        });
        funnel.afterDemand = tc.length;
        funnel.demandCut = funnel.built - tc.length;
        // ★수요(실측) + 풀 스코어(잠재 독자 크기 — 유저 회의 확정: 동탄 줍줍 vs 지방 소단지) 결합 정렬
        // ★되먹임 가중치(FF_PERF_LOOP §1-4) — 표본 30+ 조합만 ±20% 곱셈 보정. 실패/미가동=전부 1(현행 동일)
        const pw = FF.perfLoop ? await getPerfWeights(pool) : null;
        tc = tc.map((c, i) => {
          const ctx = `${c.title} ${c.keyword} ${(c.newsContext ?? "").slice(0, 200)}`;
          const vol = volMap[c.keyword]?.vol ?? -1;
          // ★볼륨 선호를 tier에 종속시킨다(2026-08-01). 기존은 항상 '검색량 높을수록 상위'라 신생 블로그에서
          //  밴드 사다리와 정반대로 굴렀다 — 트렌드 카드는 vol:0으로 만들어져 bandInvariant도 못 걸러
          //  헤드가 그대로 보드에 올랐다(7/31 발행 5편 노출 0의 직접 원인). 신생은 자기 밴드 근처를 우대한다.
          const seedling = (tierInfo?.tier ?? "SEEDLING") === "SEEDLING";
          const volBand = seedling
            ? (vol >= 5000 ? 0 : vol >= 2000 ? 1 : vol >= 100 ? 4 : vol > 0 ? 2 : 0)
            : (vol >= 5000 ? 4 : vol >= 1000 ? 3 : vol > 0 ? 1 : 0);
          const pool = poolScore(ctx);
          if (isBigPool(ctx)) (c as { demandBadge?: string }).demandBadge = `전국 관심 예상 · ${(c as { demandBadge?: string }).demandBadge ?? "잠재 수요 큰 글감"}`;
          let score = volBand + pool;
          if (pw) {
            const srcW = pw.bySource[String((c.sel as { seedSource?: string } | undefined)?.seedSource ?? "")] ?? 1;
            const hkW = c.hookKey ? (pw.byHookSpecies[`${c.hookKey}|trend`] ?? 1) : 1;
            score = score * srcW * hkW;
          }
          if (FF.perfLoop) c.sel = { ...(c.sel ?? {}), vol: volMap[c.keyword]?.vol ?? null, volBand, poolScore: pool, sortScore: score };
          return { c, i, score };
        }).sort((a, b) => (b.score - a.score) || (a.i - b.i)).map((x) => x.c);
        // ★씨앗 클레임 후순위(FF_SEED_CLAIM §5-1) — 동시 활성 발행 유저 상한 도달 씨앗은 뒤로(완전 차단 아님, 대형 풀 예외)
        if (FF.seedClaim && tc.length > 0) {
          try {
            const norms = tc.map((c) => c.keyword.replace(/\s+/g, ""));
            const sinceClaim = new Date(Date.now() - SEED_CLAIM_WINDOW_H * 3600_000).toISOString();
            const { data: claims } = await pool.from("seed_claims").select("keyword_norm, user_id").in("keyword_norm", norms).gte("created_at", sinceClaim).limit(1000);
            const cnt = new Map<string, Set<string>>();
            for (const cl of claims ?? []) { const k = String(cl.keyword_norm); if (!cnt.has(k)) cnt.set(k, new Set()); cnt.get(k)!.add(String(cl.user_id)); }
            const under: typeof tc = []; const over: typeof tc = [];
            for (const c of tc) {
              const ctx2 = `${c.title} ${c.keyword} ${(c.newsContext ?? "").slice(0, 200)}`;
              const cap = isBigPool(ctx2) ? SEED_CLAIM_CAP.big : SEED_CLAIM_CAP.normal;
              const users = cnt.get(c.keyword.replace(/\s+/g, ""));
              const mine = users?.has(user.id) ?? false; // 내가 이미 클레임한 씨앗은 후순위 제외(내 후속·시리즈 방해 금지)
              if (!mine && (users?.size ?? 0) >= cap) over.push(c); else under.push(c);
            }
            tc = [...under, ...over];
          } catch { /* 0063 미적용/조회 실패 — 후순위 미적용(fail-open은 '순서'라 안전) */ }
        }
        // ★유형 믹스 쿼터(유저 회의: 공고형이 5칸 독식 방지) — 상위 5 중 공고형 최대 2, 초과분은 6위 밖으로(대형 풀 5점+는 예외)
        {
          const top: typeof tc = []; const rest: typeof tc = [];
          let ann = 0;
          for (const c of tc) {
            if ((c as { publishedOn?: string }).publishedOn) { rest.push(c); continue; } // 발행함은 쿼터 계산 제외(실측: 발행함이 5칸을 세어 공고 3장 노출)
            const isAnn = Boolean((c as { actionEnd?: string | null }).actionEnd);
            const big = isBigPool(`${c.title} ${c.keyword} ${(c.newsContext ?? "").slice(0, 200)}`);
            if (top.length < 5 && isAnn && !big && ann >= 2) { rest.push(c); continue; }
            if (top.length < 5) { top.push(c); if (isAnn) ann += 1; } else rest.push(c);
          }
          tc = [...top, ...rest];
        }
        for (const c of tc) {
          const v = volMap[c.keyword];
          if (v) {
            c.vol = v.vol;
            const scope = v.base ? `'${v.base}' 기준 ` : ""; // 부분 매치는 조회 기준어 명시 — 전체 키워드 검색량으로 오독 방지
            // ★'수요 낮음' 판정을 트렌드 카드에서 뺀다(2026-08-05 유저 지적).
            //  월 검색량은 '지난 30일 평균'이고, 트렌드는 정의상 이번 주에 생긴 수요라 평균에 희석된다 —
            //  즉 트렌드를 에버그린 잣대로 재고 '수요 낮음'이라 부르는 자기모순이었다.
            //  ★숫자는 남긴다(스파이크가 꺼진 뒤 남는 바닥 수요 = 글의 수명 가늠). 판정 문구만 뺀다.
            (c as { demandBadge?: string }).demandBadge = v.vol >= 1000
              ? `${scope}월 ${v.vol.toLocaleString()}회 검색`
              : v.vol > 0
                ? `${scope}월 ${v.vol.toLocaleString()}회 · 지금 뜨는 주제라 평균은 낮게 잡혀요`
                : `${scope}월 평균은 아직 안 잡혀요 — 이제 막 뜨는 말이에요`; // vol 0 = keywordstool '<10' 실측(미집계 아님)
          }
        }
      }
    }
    if (tc.length === 0) {
      // ★빈손 즉석 수확(실측: 20분 빈 보드 — 백그라운드 킥은 실패해도 아무도 모른다) — 응답 안에서 1회 동기 수확 후 재시도
      try {
        const rl2 = await checkRateLimit(supabase, user.id, `trend_sync_${sub}`, 2, 900);
        if (rl2.ok) {
          await refreshCategoryTrends(sub);
          tc = await buildTrendCards(new Set());
          if (debugMode) diag.syncHarvest = tc.length;
        }
      } catch { /* 폴백 실패 — 빈 응답 그대로 */ }
    }
    {
      const g = finalGate(tc);
      if (g.drops.length) console.log("[final-gate:short]", JSON.stringify(g.drops));
      tc = g.pass;
      funnel.afterGate = tc.length;
      if (debugMode) diag.finalGateDrops = g.drops;
    }
    // ★'지금 뜨는' 열 = 홈판 + 트렌드 레인(2026-08-01 열↔레인 매핑). 이 열은 반응·시의성 게임이다.
    //  종전엔 홈판 1장 + 트렌드 나머지였는데, 그러면 배합 비율이 화면에서 무의미해진다(앞 5장만 보이므로).
    //  이제 열 안에서 레인 쿼터대로 자른다 — 신생 5장 = 홈판 4 / 트렌드 1.
    const colShort = columnQuota(tierInfo?.tier ?? "SEEDLING", "short", COLUMN_SIZE.short);
    // ★트렌드 레인에도 밴드를 건다(2026-08-01 — 급상승 우회 #2 봉쇄). 위에서 volMap으로 c.vol을 실제 값으로
    //  채워 두었기 때문에 이제 검사가 실제로 작동한다(종전엔 트렌드 카드가 전부 vol:0이라 통과가 아니라 '못 봄'이었다).
    //  홈판은 tag='홈판'으로 면제된다 — 검색량 게임이 아니라서 밴드를 적용하는 것 자체가 틀리다.
    // ★실시간 급상승 카드의 '선점 가능' 증명(2026-08-04) — 밴드를 우회시키려면 근거가 있어야 한다.
    //  급상승 키워드는 방금 뜬 것이라 검색량은 크고 문서수는 아직 얇을 수 있다 — 그 교집합이 유저가 말한
    //  '대형이어도 선점 가능한 것'이다. 그러니 그 자리에서 문서수를 재서 통과 여부를 정한다.
    //  ★대상은 급상승 유래 카드뿐(보통 0~2장)이라 호출 비용이 거의 없다.
    {
      // ★측정 대상 = 실시간 카드 + 문서 수가 비어 있는 모든 카드(2026-08-05 유저: "이거는 또 문서가 없네요").
      //  문서 수는 유저가 카드를 보고 판단하는 유일한 재료다 — 빈칸이면 판단을 못 한다.
      //  실시간이 아닌 카드는 재기만 하고 뒷북 컷은 걸지 않는다(검색 레인은 축적이 목적).
      const isRising = (c: (typeof tc)[number]) => (c as { risingSeed?: boolean }).risingSeed === true || (c.sel as { seedSource?: string } | undefined)?.seedSource === "rising";
      const risingCards = tc.filter((c) => isRising(c) || (c as { blogTotal?: number | null }).blogTotal == null);
      const rising = { seen: risingCards.length, measured: 0, pass: 0, tooMany: 0, unmeasured: 0 };
      if (risingCards.length) {
        await Promise.all(risingCards.map(async (c) => {
          const total = await fetchBlogTotal(c.keyword);
          if (total == null) { rising.unmeasured += 1; return; } // 못 쟀으면 우회 없음 — 일반 밴드 규칙으로 간다
          rising.measured += 1;
          (c as { blogTotal?: number | null }).blogTotal = total;
          // ★뒷북 컷(2026-08-05 유저 실물: 문서 345,434편이 '⚡실시간 수확'으로 섰다).
          //  실시간이라 주장하는데 문서가 이미 쌓였으면 그 주장이 거짓이다 — 라벨을 못 믿게 만든다.
          if (isRising(c) && staleForRising(total)) { (c as { risingStale?: boolean }).risingStale = true; rising.tooMany += 1; return; }
          if (!isRising(c)) return; // 검색 레인 카드는 문서 수만 채우고 배지는 건드리지 않는다
          // ★문서수 상한 폐지(2026-08-05 유저 확정: "문서수 상한율 폐지하세요").
          //  이유(유저): 지금 네이버는 홈판 때문에 신생 블로그도 상위 노출이 잘 된다.
          //  ★막지 않고 '보여준다' — 문서수는 배지에 그대로 적어 유저가 카드를 보고 판단한다.
          {
            (c as { risingPass?: boolean }).risingPass = true;
            rising.pass += 1;
            // ★배지는 문서수 구간대로 정직하게 말한다(2026-08-05 유저 지적: "7,486편인데 선점 구간?").
            //  1만 미만이면 통과시키기로 했지만, 7천 편은 '선점'이 아니다 — 이미 쌓인 자리다.
            //  통과와 선점은 다른 말이고, 그 둘을 같은 말로 쓰면 유저가 우리 배지를 못 믿게 된다.
            const room = total < 1000 ? "거의 안 쓰인 자리" : total < 3000 ? "아직 얇은 자리" : "이미 쌓인 자리 — 각도로 승부";
            c.demandBadge = `실시간 급상승 · 지금 글 ${total.toLocaleString("ko-KR")}편 — ${room}`;
            void DOC_HARD_MAX; // 상한은 더 이상 통과 조건이 아니다(표시·정렬 재료로만 남는다)
            // ★공고·모집성 키워드는 '행동 창'이 생명인데, 자동완성·급상승 유래에는 마감일 정보가 없다.
            //  (청약홈·보조금24 씨앗은 actionEnd를 갖지만 이 경로는 그게 없다 — 유저가 '7월 공고 아니냐'고 물은 자리다.)
            //  ★그러면 모른다고 말하고, 본문이 반드시 확인하게 지시한다. 아는 척이 제일 위험하다.
            if (/(청약|공고|모집|접수|분양|특별공급|무순위)/.test(c.keyword)) {
              c.demandBadge += " · 일정 확인 필요";
              (c as { briefText?: string }).briefText = `${(c as { briefText?: string }).briefText ?? ""}\n★[일정 확인 의무] 이 글감은 실시간 검색 급상승에서 왔지만 공고 일정 정보가 없다. 공고가 이미 마감됐을 수 있다 — 반드시 공식 공고(청약홈·해당 기관)에서 접수 기간을 확인하고, 지난 공고면 '지금 신청하세요'로 쓰지 마라. 지난 공고라면 후속 일정(당첨자 발표·계약·잔여세대·다음 차수) 관점으로 쓰고, 그 사실을 본문에 명시한다.`.trim();
            }
          }
        }));
        // ★뒷북으로 판정된 카드는 보드에서 뺀다 — 재고 나서 안 거를 거면 재는 의미가 없다(CLAUDE.md).
        const staleOut = tc.filter((c) => (c as { risingStale?: boolean }).risingStale === true);
        if (staleOut.length) {
          tc = tc.filter((c) => (c as { risingStale?: boolean }).risingStale !== true);
          console.log(`[rising-lane] 뒷북 제외 ${staleOut.length}장(문서 ${RISING_STALE_MAX.toLocaleString("ko-KR")}편 초과) — ${staleOut.map((c) => `${c.keyword}(${(c as { blogTotal?: number }).blogTotal?.toLocaleString("ko-KR")}편)`).join(", ")}`);
          if (debugMode) diag.risingStale = staleOut.map((c) => ({ keyword: c.keyword, blogTotal: (c as { blogTotal?: number }).blogTotal ?? null }));
        }
        console.log(`[rising-lane] 카드 ${rising.seen} → 측정 ${rising.measured} · 선점통과 ${rising.pass} · 뒷북제외 ${rising.tooMany} · 미측정 ${rising.unmeasured}`);
      }
      if (debugMode) diag.rising = rising;
    }
    // ★'지금 뜨는' 열에서 검색량 밴드를 해제한다(2026-08-05 유저 확정).
    //  근거: 8월 4일 네이버 경제 인기유입검색어 20개(ISA·세제개편안·민생지원금·근로장려금 지급일…)는
    //  전부 월 검색량 수만~수십만이다. 신생 밴드(100~2,000, 상한 3,000)는 그 구간을 통째로 차단한다 —
    //  즉 우리는 '실제로 유입이 나는 구간'을 스스로 배제하고 있었다.
    //  ★유저 판단: 지금 네이버는 홈판 덕에 신생도 상위 노출이 된다. 검색량으로 미리 겁먹지 않는다.
    //   대형이 상위에 못 가면 그때 수정한다 — 안 해보고 막지 않는다.
    if (debugMode) diag.bandOff = { note: "지금 뜨는 열은 검색량 밴드 미적용(2026-08-05)", ceil: bandCeil };
    // ★자리 배분에서도 실시간을 앞에 세운다 — 통과시켜 놓고 뒤로 밀면 화면에는 안 보인다(유저가 보는 건 앞 몇 장뿐).
    tc = [...tc.filter((c) => (c as { risingPass?: boolean }).risingPass === true), ...tc.filter((c) => (c as { risingPass?: boolean }).risingPass !== true)];
    funnel.afterBand = tc.length;

    // ★홈판을 '먼저' 확보하고, 실제로 확보한 장수만큼만 트렌드 자리를 내준다(2026-08-01 실사이트 확인에서 검거).
    //  종전엔 쿼터(4)를 기준으로 트렌드를 1장으로 먼저 잘라 놓고 홈판을 만들었다. 그런데 홈판이 3장만 나오면
    //  트렌드는 이미 잘려 있어 메울 수가 없다 → 5장 열에 4장만 서빙됐다(실측: 홈판 3 + 트렌드 1 = 4).
    //  결품은 '있을 수 있는 일'이고(LLM 생성·게이트·중복), 그때 열이 비는 게 진짜 사고다.
    const homeCards: TrendCard[] = [];
    // ★손실 회계(2026-08-02) — 종전엔 세 필터가 전부 조용히 continue라서, 화면에 2장만 떠도
    //  '생성이 안 된 건지 걸러진 건지'를 알 방법이 없었다. 결품이 상시화된 레인에서 이건 눈을 감는 것이다.
    const homeDrop = { used: 0, gate: 0, dup: 0 };
    if (FF.homefeedBet) {
      try {
        // ★유사 판정을 생성 안으로 넘긴다(2026-08-02 실측: 캐시된 4장이 전부 여기서 탈락해 홈판이 하루 종일 0장).
        //  거르는 자리와 캐시하는 자리가 어긋나면 캐시가 '실패를 굳히는 장치'가 된다.
        //  최근 제목도 함께 넘긴다 — 키워드만 주면 모델이 주제만 피하고 같은 문장 틀로 돌아온다.
        const recentTitles = recent14.map((a) => String(a.title ?? "")).filter(Boolean).slice(0, 15);
        const bets = await pickHomefeedBets(pool, user.id, sub ?? "", usedSet, colShort.homefeed, {
          isDup: (title, keyword) => usedForbidden(`${title} ${keyword}`),
          recentTitles,
          // ★최근 14일 키워드 — 소재(핵심어) 반복을 코드가 막는다(2026-08-05: 어제 쓴 엔화·전기차가 오늘 또 섰다)
          recentKeywords: recent14.map((a) => String(a.keyword ?? "")).filter(Boolean).slice(0, 30),
        });
        for (const bet of bets) {
          // ★이미 생성/발행한 홈판 글감은 숨김(실측 2026-07-16: 발행했는데 카드 잔존 — 홈판 카드는 발행함 마킹 로직 밖이라 usedSet으로 직접 차단)
          if (!bet || usedSet.has(normalizeKeyword(bet.keyword))) { homeDrop.used++; continue; }
          // ★발행한 글과의 유사 검사(2026-08-02 유저 실측: "이직 전 3일, 이것 안 하면 퇴직금 줄어듭니다"가
          //  아침에 올린 글과 겹쳐 나왔다). 홈판 카드는 이 게이트를 통째로 안 지나고 있었다 —
          //  usedSet은 '키워드 정확 일치'만 보는데, 홈판 keyword는 검색어가 아니라 주제 앵커라 거의 안 걸린다.
          //  ★홈판은 앵커가 느슨한 만큼 제목으로 봐야 한다. 검색 레인과 같은 게이트를 태운다.
          //  ★1차 방어는 pickHomefeedBets 안(캐시 이전)에서 끝났다. 여기는 이중 방어다 —
          //   캐시가 이 게이트를 붙이기 전에 저장된 것일 수 있어서(기존 캐시 소진 전까지).
          if (usedForbidden(`${bet.title} ${bet.keyword}`)) { homeDrop.used++; continue; }
          if (finalGate([{ keyword: bet.keyword, title: bet.title }], { anchorKeyword: true }).pass.length === 0) { homeDrop.gate++; continue; }
          if (tc.some((t) => t.keyword === bet.keyword) || homeCards.some((h) => h.keyword === bet.keyword)) { homeDrop.dup++; continue; }
          homeCards.push({
            keyword: bet.keyword, title: bet.title,
            demandLabel: `홈판 배팅 · ${bet.betType}`,
            ssak: true, region: false, tone: bloggerType(vertical), vol: 0, comp: "low" as Comp, blogTotal: null,
            // ★출처 노출(2026-08-03 유저 요청) — 화면이 '출처 이슈: …'로 렌더한다. 실데이터 카드인지 눈으로 확인 가능하게.
            tag: "홈판", briefText: bet.briefText, sourceTitle: bet.sourceTitle,
            thumb: { mainCopy: bet.thumbCopy, subCopy: "", badge: "홈판" },
            demandBadge: "터지면 상한 없음 — 승부는 검색량이 아니라 반응(공감·저장)",
            ...(FF.perfLoop ? { sel: { species: "homefeed", seedSource: "homebet", sourceTitle: bet.sourceTitle ?? null, cluster: clusterKey(bet.keyword), hookKey: bet.betType } } : {}),
          } as TrendCard);
        }
      } catch (e) {
        // ★조용한 0장 금지 — 홈판이 통째로 실패하면 화면은 '트렌드만 있는 열'로 보이고 원인이 안 남는다.
        console.error("[homebet] 배팅 단계 실패 — 홈판 0장:", e instanceof Error ? e.message : e);
      }
    }
    const trendStock = tc.length; // ★메우기 전 트렌드 재고 — 홈판이 비어도 트렌드가 없으면 열은 못 채운다
    const trendRoom = Math.max(0, COLUMN_SIZE.short - homeCards.length); // ★쿼터가 아니라 '실제 확보분' 기준
    // ★홈판과 트렌드가 같은 소재를 들고 오는 것을 막는다(2026-08-05 유저 화면에서 검거:
    //  '페이코 포인트'가 홈판 1장 + 유행 1장으로 같은 열에 나란히 섰다).
    //  두 레인은 같은 씨앗 창고를 보는데 서로를 안 봤다 — 종전 검사는 키워드 '정확 일치'뿐이라
    //  '페이코 포인트 출금'과 '누적된 페이코 포인트'가 다른 것으로 통과했다.
    //  ★같은 날 같은 소재 두 장은 네이버에서 서로 잡아먹는다(유저 절대조건: 중복 금지).
    {
      const STOP = new Set(["지원금", "신청", "방법", "조건", "기준", "정리", "혜택", "제도", "현실", "이유", "기한", "경우", "사람", "비율", "출금", "납부"]);
      const toks = (t: string) => String(t || "").split(/[\s·,]+/).map((w) => w.replace(/[^가-힣a-zA-Z0-9]/g, ""))
        .filter((w) => [...w].length >= 2 && !STOP.has(w));
      const homeToks = new Set(homeCards.flatMap((h) => toks(`${h.keyword} ${h.title}`)));
      const before = tc.length;
      tc = tc.filter((t) => {
        const hit = toks(`${t.keyword} ${t.title}`).find((w) => homeToks.has(w));
        if (hit) console.log(`[lane-dup] 홈판과 같은 소재 — 트렌드 카드 제외: "${t.keyword}" (겹친 말 '${hit}')`);
        return !hit;
      });
      if (debugMode) diag.laneDup = before - tc.length;
    }
    tc = [...homeCards, ...tc.slice(0, trendRoom)];
    if (colShort.homefeed > homeCards.length) {
      console.log(`[lane-quota:short] 홈판 미달 ${homeCards.length}/${colShort.homefeed} — 하류 탈락(이미쓴 ${homeDrop.used}·게이트 ${homeDrop.gate}·중복 ${homeDrop.dup}), 트렌드가 ${trendRoom}장까지 메움`);
    }
    // ★열이 비는 게 진짜 사고다(위 주석의 원칙) — 그런데 종전엔 '못 메운 경우'가 로그에 안 남았다.
    //  홈판이 결품이어도 트렌드 재고가 있으면 열은 찬다. 둘 다 모자랄 때만 열이 빈다 — 그 순간을 남긴다.
    if (tc.length < COLUMN_SIZE.short) {
      console.log(`[lane-quota:short] ★열 결품 ${tc.length}/${COLUMN_SIZE.short} — 홈판 ${homeCards.length} + 트렌드 재고 ${trendStock}(자리 ${trendRoom}). 두 레인 모두 공급 부족.`);
      // ★트렌드가 어느 마디에서 말랐는지 — 이 줄이 컷 완화의 근거가 된다(추측으로 게이트를 열지 않는다)
      console.log(`[trend-funnel] 증식 ${funnel.built} → 수요컷 -${funnel.demandCut}(제로 ${funnel.zeroDemand}·저수요 ${funnel.lowDemand}·미조회공고 ${funnel.unlistedAnnounce}) → ${funnel.afterDemand} → 게이트 ${funnel.afterGate} → 밴드 ${funnel.afterBand}`);
    }
    // ★증식 진단을 함께 싣는다(2026-08-04 유저 요청) — '씨앗 19개인데 증식 4장'의 어디가 병목인지
    //  로그를 뒤지지 않고 주소 하나로 보이게 한다. 한 번 보고 고치면 되는 자리다.
    // ★밴드가 무엇을 잘랐는지 보여준다(2026-08-04 실측: 게이트 4 → 밴드 1, 즉 3장이 여기서 죽었다).
    //  잘린 것이 '대형이라 못 이길 것'인지 '대형인데 선점 가능한 것'인지는 키워드를 봐야 판단할 수 있다.
    if (debugMode) diag.bandCut = { ceil: bandCeil, items: leakedAll.filter((x) => x.where === "short-trend").slice(0, 8) };
    if (debugMode) diag.ampFunnel = lastAmplifyDiag;
    // ★홈판 생성 진단도 함께(2026-08-04) — '홈판 2/5'가 화면에 뜨는데 이유는 서버 로그에만 있었다.
    //  homeDrop(하류 탈락)이 전부 0인데 결품이면 원인은 생성 안쪽이다 — 그 안쪽을 여기서 보여준다.
    if (debugMode) diag.homeBet = lastHomebetDiag;
    // ★원천 칸 집계(2026-08-05 유저 요청: "카테고리 칸을 나눠서, 청약홈 칸에 글감이 있고 없고를 알게").
    //  어느 원천이 조용한지 한눈에 보이면, '이슈가 없는 것'과 '우리가 못 잡은 것'을 구분할 수 있다.
    tc = stampSlots(tc);
    if (debugMode) diag.slots = slotCount(tc);
    if (debugMode) diag.colShort = { ...colShort, homefeedGot: homeCards.length, homeDrop, trendRoom, served: tc.length, trendFunnel: funnel };
    return NextResponse.json(debugMode ? { topics: tc, diag: { ...diag, mode: "short", trendCards: tc.length } } : { topics: tc, ...(FF.perfLoop ? { ff: { perfLoop: true } } : {}) });
  }

  // 단계적 폴백: (sub+적정범위) → (sub+전체). ★vertical 전체 폴백 제거(실측: 자동차 블로그에 '파쇄기' —
  //  타 주제 키워드가 오늘의 글로 서는 관련성 붕괴). sub 풀이 비면 아래 '게으른 채우기'가 그 주제로 즉석 수집,
  //  그동안은 트렌드(카테고리 즉석 수확)와 수집중 UI가 받친다 — 무관 글감보다 잠깐의 빈자리가 낫다.
  const steps: [boolean, boolean][] = sub
    ? [[true, true], [true, false]]
    : [[false, true], [false, false]];
  let rows: PoolRow[] = [];
  tierInfo = tierInfo ?? (await loadTier()); // ★FF_TIER_BANDS — 위에서 이미 읽었으면 재사용(캐시 24h, 실패=기존 밴드)
  for (const [useSub, ranged] of steps) {
    rows = await fetchPool(useSub, ranged);
    if (rows.length >= PICK) break;
  }

  // ── 게으른 풀 채우기 ──
  // '표시 가능한 글감(고경쟁 제외)' 기준으로 건강도 판정 → 개수만 많고 브랜드·고경쟁뿐인 옛 풀도 재빌드.
  // HEALTHY = 표시3 + 교체 여유. 부족하면 AI 시드(완벽함)로 보강. 남용 방지 레이트리밋(20/10분).
  const HEALTHY = 15;
  const isRegionReq = new URL(req.url).searchParams.get("region") === "1";
  if (sub && !isRegionReq) { // 지역 강화 요청은 region 수집을 쓰므로 일반 풀 빌드 건너뜀(느린 빌드 방지)
    const subRows = await fetchPool(true, false); // 이 sub 전체(범위 무관)
    const goodCount = subRows.filter((r) => (r.competition ?? "").trim() !== "높음").length;
    if (goodCount < HEALTHY) {
      const seedRl = await checkRateLimit(supabase, user.id, "pool_seed", 20, 600);
      if (seedRl.ok) {
        // ★풀 수집을 응답 밖으로 뺀다(2026-08-05 유저 실측: '꾸준한 수요' 열이 통째로 비고 기본 경로가 504).
        //  buildPoolForSub는 네이버 수집을 요청 안에서 돈다 — 재고가 얇아지면 매 요청마다 발동해
        //  60초를 넘기고, 그러면 응답이 통째로 죽어 열이 '채우는 중'으로 남는다.
        //  ★재고가 얇을수록 더 자주 죽는다 — 정확히 채워야 할 때 못 채우는 구조였다.
        //  이제 백그라운드로 채우고 이번 응답은 있는 재고로 낸다. 다음 요청이 채워진 풀을 본다.
        after(async () => {
          try { await buildPoolForSub(vertical, sub, { sleepMs: 300 }); } catch { /* 수집 실패 — 다음 회차 */ }
        });
        console.log(`[pool-warm:lazy] ${sub} 재고 부족(${goodCount}/${HEALTHY}) — 백그라운드 수집 시작(이번 응답은 기존 재고로)`);
      }
    }
  }

  // ★교체 반복으로 표시 가능 글감이 바닥나면 — 빈 화면 대신 제외 목록을 풀고 재조회(이미 본 글감 재등장 허용)
  if (rows.length < PICK && excludeSet.size > 0) {
    for (const nk of excludeSet) usedSet.delete(nk);
    for (const [useSub, ranged] of steps) {
      rows = await fetchPool(useSub, ranged);
      if (rows.length >= PICK) break;
    }
  }
  if (rows.length === 0) { const tc = stampSlots(await buildTrendCards(new Set())); return NextResponse.json(debugMode ? { topics: tc, slots: slotCount(tc), diag: { ...diag, note: "pool 0 — trend only", trendCards: tc.length } } : { topics: tc }); }

  // ── 경쟁도 티어 ──
  // 낮음 = 싹 키워드(전설·희귀), 중간 = 일반(기본), 높음 = 빅키워드(최후)
  const comp = (r: PoolRow) => (r.competition ?? "").trim();
  // ★단가 축(Part B) — '단가 높음'은 카테고리 '상대 상위 30% 랭크'(절대값이면 금융 독식, percentile은 동률 포화 시 전원/0명 — 실측으로 랭크 확정).
  //  단가점수 = ad_depth(광고 밀도 프록시, 천장 10) + 광고경쟁 보정. 동률은 검색량 큰 순. 바닥 depth 5 미만은 제외.
  const bidScoreOf = (r: PoolRow) => (r.ad_depth ?? 0) + (BID_COMP_BONUS[(r.competition ?? "").trim()] ?? 0);
  const bidRanked = rows.filter((r) => (r.ad_depth ?? 0) >= BID_HIGH_MIN_DEPTH)
    .sort((a, b) => bidScoreOf(b) - bidScoreOf(a) || (b.monthly_searches ?? 0) - (a.monthly_searches ?? 0));
  const badgeN = bidRanked.length >= 4 ? Math.max(1, Math.round(bidRanked.length * BID_BADGE_RATIO)) : 0;
  const bidHighSet = new Set(bidRanked.slice(0, badgeN).map((r) => r.keyword));
  const bidHigh = (r: PoolRow) => bidHighSet.has(r.keyword);
  // 서빙 랭크 소프트 부스트 — 랜덤(0~1) + BID_WEIGHT×정규화 단가. 다양성(셔플)은 유지하되 단가 높은 글감이 자주 앞에.
  //  가중치 상수는 lib/scoreWeights — '공격 모드'가 나중에 이 상수를 오버라이드한다.
  const bidW = attack ? ATTACK.BID_WEIGHT : BID_WEIGHT; // ★공격 모드 = 상수 오버라이드(scoreWeights.ATTACK)
  const mixW = ((profile as { mix_weights?: Record<string, number> } | null)?.mix_weights) ?? {}; // 증폭 가중 학습(상한·하한은 저장 시 강제)
  const bidBoostSort = (items: PoolRow[]): PoolRow[] =>
    items.map((r) => {
      const isRev = revenuePath({ keyword: r.keyword }) === "shopping";
      const revBoost = (attack ? ATTACK.REVIEW_BOOST : 0) + (isRev ? ((mixW.review ?? 1) - 1) * 0.3 : ((mixW.info ?? 1) - 1) * 0.3);
      return { r, s: rng() + bidW * (Math.min(r.ad_depth ?? 0, BID_DEPTH_CAP) / BID_DEPTH_CAP) + (isRev ? revBoost : 0) };
    }).sort((a, b) => b.s - a.s).map((x) => x.r);
  const low = rows.filter((r) => comp(r) === "낮음");
  const mid = rows.filter((r) => comp(r) === "중간");
  const high = rows.filter((r) => comp(r) === "높음");

  // ── 지역 글감(먼저 — 일반 후보 개수 계산에 필요) ──
  // 지역형 사업장이면 동네+업종 글감을 앞에. 본인이 쓴 건 제외.
  const level = regionLevel(vertical, sub ?? null); // 하드코딩 폴백(AI 실패 시)
  const type = bloggerType(vertical); // local/online/hobby → 카피 톤
  const addr = profile?.biz_address as string | null;
  // ── 업소별 지역 범위 AI 판정 — 업종/세부/위치로 손님 이동반경 계산(성형=전국, 소아=시, 치과=동네 …) ──
  // AI 실패 시 regionLevel 폴백(wide→nation, gu→si, dong→dong).
  let scope: LocalScope = level === "wide" ? "nation" : level === "gu" ? "si" : "dong";
  let aiAreas: string[] = [];
  let aiTraits: string[] = [];
  if (type === "local" && addr && !cluster) {
    const aud = audActive ? audSel.filter((a) => a !== AUDIENCE_ALL).join("·") : undefined;
    const plan = await resolveLocalPlan(addr, sub || vertical, aud);
    if (plan) { scope = plan.scope; aiAreas = plan.areas; aiTraits = plan.traits; }
  }
  // scope → 지역 계층 순서. dong=읍/동 우선, si·nation=시 우선. AI 별칭(오송)을 맨 앞 보강.
  let regions: string[];
  if (scope === "dong") {
    regions = [...new Set([...aiAreas, ...addressRegionTiers(addr, "dong")])];
  } else {
    const t = addressRegionTiers(addr, "gu"); // [구, 시]
    const si = t[t.length - 1]; const gu = t[0];
    // AI가 scope에 맞게(si·nation=도시 먼저) 순서를 내므로 aiAreas를 앞에. 파싱 폴백은 시→구.
    regions = [...new Set([...aiAreas, si, gu].filter((x): x is string => !!x))];
  }
  const local = type === "local" && regions.length > 0 && !cluster;
  // 지역 강화 모드 — 지역형(bloggerType=local)이면 ON(법률·세무 포함). scope가 범위를 결정.
  // 주소가 비면 region 분기에서 빈 결과 → 클라가 '업체 등록/못 찾음' 안내(일반 글감 폴백 X).
  const regionMode = new URL(req.url).searchParams.get("region") === "1" && type === "local" && !cluster;

  // 하루 고정 시드(userId+날짜): 그날은 새로고침해도 같은 추천. regen 논스가 오르면 그날 세트도 갈린다.
  const rng = mulberry32(seedFrom(`${user.id}-${new Date().toISOString().slice(0, 10)}-r${regenNonce}`));
  const want = PICK + 8; // ok·적합도 필터 후에도 PICK개 채우게 넉넉히
  let candidates: PoolRow[] = [];

  if (regionMode) {
    // ── 지역 강화: 지역 키워드 '실데이터'(네이버 검색량/경쟁) 수집 — '오송 영어학원' 등 ──
    const audSeed = audActive ? audSel.filter((a) => a !== AUDIENCE_ALL) : [];
    const baseSeeds = buildLocalSeeds(regions, vertical, sub ?? null, audSeed).slice(0, 6);
    // 지역 특성(산단·신도시 등) 시드 — '오송 산업단지', '오송 바이오' 식. 무관하면 뒤 ok 필터가 거름.
    const area0 = aiAreas[0] ?? regions[0];
    const traitSeeds = area0 ? aiTraits.slice(0, 2).map((tr) => `${area0} ${tr}`) : [];
    // 네이버 자동완성 — 우리 동네 사람들이 실제 치는 검색어를 시드로(진짜 동네 키워드). 시드 넉넉히 → 필터 후에도 3개 채움
    const acSeeds = baseSeeds.length
      ? [...new Set((await Promise.all(baseSeeds.slice(0, 2).map((s) => fetchNaverAutocomplete(s)))).flat())].slice(0, 4)
      : [];
    const seeds = [...new Set([...baseSeeds, ...traitSeeds, ...acSeeds])];
    const collected = new Map<string, PoolRow>();
    for (const seed of seeds) {
      try {
        const kws = await collectPoolKeywords(seed);
        for (const k of kws) {
          if (collected.has(k.keyword) || usedSet.has(normalizeKeyword(k.keyword)) || isUnsafeKeyword(k.keyword)) continue;
          if (mentionsForeignRegion(k.keyword, regions)) continue; // ★타지역(천안 등) 제거 — 우리 지역/일반 분야만
          collected.set(k.keyword, { keyword: k.keyword, monthly_searches: Number(k.monthlySearches) || 0, competition: k.compIdx ?? null, audience: null, blog_total: null });
        }
      } catch { /* 수집 실패 시드는 건너뜀 */ }
    }
    // ★검색량에 의존하지 않는 '생성' 지역 글감 — 작은 동네 키워드는 네이버 볼륨이 0이라 위 수집엔 안 잡히지만,
    //   동네 손님은 꾸준히 검색(고의도·무경쟁). 지역×업종×대상×특성으로 만들어 항상 채운다(네이버 데이터는 보강용).
    const aud = audActive ? audSel.filter((a) => a !== AUDIENCE_ALL).join("·") : undefined;
    const gen = await generateLocalKeywords(regions, sub || vertical, aud, aiTraits);
    const norms = new Set([...collected.keys()].map((k) => normalizeKeyword(k)));
    for (const kw of gen) {
      const nk = normalizeKeyword(kw);
      if (norms.has(nk) || usedSet.has(nk) || isUnsafeKeyword(kw) || mentionsForeignRegion(kw, regions)) continue;
      norms.add(nk);
      collected.set(kw, { keyword: kw, monthly_searches: 0, competition: null, audience: null, blog_total: null }); // 볼륨 미측정(생성)
    }
    // ★지역 전용: '지역명이 들어간 진짜 지역 키워드'만(일반 분야 padding 안 함). 진행적 확장(오송→흥덕→청주) 순.
    // 같은 tier 안에선 측정 검색량 있는 것 먼저(실수요 증명) → 생성(볼륨0)이 뒤를 채움.
    const regionIdx = (kw: string) => regions.findIndex((r) => kw.includes(r));
    candidates = [...collected.values()]
      .filter((c) => regionIdx(c.keyword) >= 0) // 지역명 포함만
      .sort((a, b) => regionIdx(a.keyword) - regionIdx(b.keyword) || (b.monthly_searches ?? 0) - (a.monthly_searches ?? 0))
      .slice(0, want);
  } else {
    // ── 일반 후보(풀 기반) ── 노이즈·중복 제외로 빠질 것 대비해 여유분(want)까지.
    // 지역형(주소 있음)이면 '타지역' 키워드(대구 화상영어 등)는 일반 글감에서도 제거 — 우리 지역/일반 분야만.
    const noForeign = (arr: PoolRow[]) => (regions.length ? arr.filter((r) => !mentionsForeignRegion(r.keyword, regions)) : arr);
    // ★최상급 계정(w.95arrior): 랜덤 배제 — 경쟁 '낮음' 전부 먼저(검색량순), 모자라면 '중간'(검색량순)
    if (adminBest) {
      // ★'이길 수 있는' 우선 — 캐시된 진짜 경쟁(blog_total)이 있으면 그 별점을 최우선, 검색량은 그다음.
      //  검색량 탐욕 정렬은 포화 키워드만 모아 winnable 필터에서 전멸했음(경쟁높음 범람의 원인).
      const score = (r: PoolRow) =>
        (r.blog_total != null ? filledStarsFromData(r.monthly_searches ?? 0, r.blog_total) : 3) * 1_000_000 + (r.monthly_searches ?? 0);
      // ★high 꼬리 보충(2026-07-31 검거) — 종전엔 low+mid만 봤다. 일반 유저 경로에는 add(highF) 폴백이 있는데
      //  관리자 경로에만 빠져 있었다(경로별 복붙 누락). 금융 풀은 경쟁 '높음'이 압도적이라
      //  실측에서 survived 147 중 low+mid가 3건뿐 → 후보 3 → 보드 0장이 됐다.
      //  low·mid를 항상 앞에 두므로 우선순위는 그대로다. high는 빈자리를 메우는 꼬리로만 붙는다.
      const rank = (arr: PoolRow[]) => arr.sort((a, b) => score(b) - score(a));
      const ordered = [...rank([...noForeign(low), ...noForeign(mid)]), ...rank([...noForeign(high)])];
      const adminWant = want * 3 + 6; // 후보 폭 확대 — 실측 후에도 winnable이 넉넉히 남게
      for (const r of ordered) {
        if (candidates.length >= adminWant) break;
        const nk = normalizeKeyword(r.keyword);
        if (!candidates.some((x) => normalizeKeyword(x.keyword) === nk)) candidates.push(r);
      }
    } else {
    // 오디언스 밸런스(넉넉히) → 소주제 분산. 둘 다 만족해 비슷한 글감 몰림 방지.
    const balanced = pickBalanced(bidBoostSort(noForeign(mid)), audActive ? audSel : [], (want + 1) * 2, rng); // ★단가 소프트 부스트(BID_WEIGHT)
    const general = pickDiverse(balanced, want + 1, rng);
    const lowF = noForeign(low), highF = noForeign(high);
    if (lowF.length > 0 && rng() < 0.28) candidates.push(lowF[Math.floor(rng() * lowF.length)]); // 싹 1개 가끔
    const add = (arr: PoolRow[]) => {
      for (const r of arr) {
        if (candidates.length >= want) break;
        const nk = normalizeKeyword(r.keyword);
        if (!candidates.some((x) => normalizeKeyword(x.keyword) === nk)) candidates.push(r); // 정규화 중복 제거
      }
    };
    add(general); add(lowF); if (attack && ATTACK.ALLOW_COMP_HIGH) add(bidBoostSort(highF)); else add(highF); // ★공격: 경쟁 높음도 정식 후보(이길 수 있는 싸움)
    }

    // ★자영업자: 검색량 풀이 오염(여행영어 등)·얕아 온타겟이 부족할 수 있다 → '손님(대상)이 검색하는' 글감을 생성해 합류.
    //   생성분은 검색자=손님 매칭이 보장돼, 뒤의 ok/fit 게이트를 통과하며 빈자리를 채운다(볼륨0=고의도·무경쟁).
    if (type === "local") {
      const audStr = audActive ? audSel.filter((a) => a !== AUDIENCE_ALL).join("·") : undefined;
      const genTopics = await generateAudienceTopics(sub || vertical, audStr);
      const norms = new Set(candidates.map((c) => normalizeKeyword(c.keyword)));
      for (const kw of genTopics) {
        const nk = normalizeKeyword(kw);
        if (norms.has(nk) || usedSet.has(nk) || isUnsafeKeyword(kw)) continue;
        if (regions.length && mentionsForeignRegion(kw, regions)) continue;
        norms.add(nk);
        candidates.push({ keyword: kw, monthly_searches: 0, competition: null, audience: null, blog_total: null });
      }
    }
  }

  // ── 제목·카테고리·노이즈판별(여유분 한 번에) ──
  // ★스포크 확장(2026-07-10 유저: 상위 후보 소진 — 쓸수록 풀이 자라는 구조): 최근 발행 키워드의 연관어를
  //  keywordstool에서 캐와(검색량 실측 포함) 미사용 신규만 후보 합류 + 공유 풀에 적립. 24h 캐시·요청당 2시드.
  try {
    const spokeKey = `spokes:${user.id}:${sub}:${new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)}`;
    let spokes: { keyword: string; monthly_searches: number; competition: string | null }[] | null = null;
    const { data: sc } = await pool.from("api_cache").select("value, expires_at").eq("key", spokeKey).maybeSingle();
    if (sc?.value && new Date(String(sc.expires_at)).getTime() > Date.now()) spokes = sc.value as typeof spokes;
    if (!spokes) {
      spokes = [];
      const seeds = [...new Set((mine ?? []).slice(0, 12).map((a) => String(a.keyword ?? "").trim()).filter((k) => k.length >= 2))].slice(0, 2);
      for (const seed of seeds) {
        const rel = await fetchRelatedKeywords(seed).catch(() => []);
        for (const r of rel.slice(0, 20)) {
          const kw = String(r.relKeyword ?? "").trim();
          if (!kw || usedSet.has(normalizeKeyword(kw))) continue;
          const vol = (typeof r.monthlyMobileQcCnt === "number" ? r.monthlyMobileQcCnt : 0) + (typeof r.monthlyPcQcCnt === "number" ? r.monthlyPcQcCnt : 0);
          if (vol < 800) continue; // 실측 수요 있는 스포크만
          if (vol > TIER_BANDS[tierInfo?.tier ?? "SEEDLING"].volMax * 1.5) continue; // ★밴드 상한(2026-07-20 검거: 스포크가 상한 없이 87,900 합류 — 오염 발행의 연관어가 오염을 재생산)
          spokes.push({ keyword: kw, monthly_searches: vol, competition: String(r.compIdx ?? "") || null });
        }
      }
      spokes = spokes.slice(0, 10);
      try { await pool.from("api_cache").upsert({ key: spokeKey, value: spokes, expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(), updated_at: new Date().toISOString() }); } catch { /* ignore */ }
    }
    // ★캐시 히트 경로도 필터(오늘치 캐시에 이미 오염분 저장돼 있음)
    const spokeCeil = TIER_BANDS[tierInfo?.tier ?? "SEEDLING"].volMax * 1.5;
    spokes = spokes.filter((sp) => (sp.monthly_searches ?? 0) <= spokeCeil);
    for (const sp of spokes) {
      const nk = normalizeKeyword(sp.keyword);
      if (!candidates.some((x) => normalizeKeyword(x.keyword) === nk)) {
        candidates.push({ keyword: sp.keyword, monthly_searches: sp.monthly_searches, competition: sp.competition, audience: null, blog_total: null } as (typeof candidates)[number]);
      }
    }
    if (debugMode) diag.spokes = spokes.length;
  } catch { /* 스포크 확장 실패는 기본 풀로 진행 */ }

  // ★에버그린 뉴스성 게이트(유저 실측: '2분기실적발표' — 검색량이 있어도 특정 기업을 찾는 수요라 일반 정보글에 안 붙는다)
  //  트렌드 쪽 감점과 동일 철학 — 읽고 끝나는·특정 대상 없는 뉴스성 키워드는 풀에서 제외
  const NEWSY_POOL = /(실적발표|실적 발표|어닝|주가 전망|증시 전망|환율 전망|공모주 일정|급등주|테마주|수혜주)/;
  const candidates2 = candidates.filter((r) => !NEWSY_POOL.test(r.keyword));
  const allKeywords = candidates2.map((r) => r.keyword);
  if (allKeywords.length === 0) { const tc = stampSlots(await buildTrendCards(new Set())); return NextResponse.json(debugMode ? { topics: tc, slots: slotCount(tc), diag: { ...diag, note: "allKeywords 0", trendCards: tc.length } } : { topics: tc }); }
  // 통합 맥락(분야·대상·사용자 지역) → AI가 브랜드·타지역·대상불일치·무관 키워드까지 한 번에 거름
  const ctxParts = [`분야: ${sub || vertical}`];
  if (audActive) ctxParts.push(`대상: ${audSel.filter((a) => a !== AUDIENCE_ALL).join("·")}`);
  if (local && regions.length) ctxParts.push(`사용자 지역: ${regions.join("·")}`);
  if (regionMode && aiTraits.length) ctxParts.push(`동네 특성: ${aiTraits.join("·")}`);
  const titled = await keywordsToTitles(allKeywords, ctxParts.join(" / "), { localBiz: type === "local" }); // {title, tag, ok, fit} — 자영업자는 '검색자=손님' 매칭 게이트 강하게

  // fit 상위 후보를 넉넉히(PICK+6) 추림 — 대표 샘플이면 포화 키워드가 많이 보여서, 같은 fit 안에서 '이길 수 있는' 걸 고른다.
  const fitScored = candidates2
    .map((r, i) => ({ r, t: titled[i] })) // ★candidates2로 통일 — 뉴스성 필터 후 인덱스가 titled와 1:1이어야(실측: 필터로 한 칸 밀려 제목·키워드 어긋남)
    .filter(({ t }) => t?.ok !== false && !staleYear(t?.title ?? ""));
  // ★분야 주변(fit=0) 배제(2026-07-24 유저: 경제 블로그에 '그림 파는 법') — fit은 정렬만 하고 배제 안 해 얇은 날 노출됐다.
  //  세부업종(sub)이 있고 분야 핵심(fit>=1)이 보드를 채우고도 남을 때만 뺀다(빈자리 방지 플로어 — 얇은 날은 주변도 허용).
  const onFit = fitScored.filter(({ t }) => (t?.fit ?? 1) >= 1);
  let fitBase = (sub && onFit.length >= PICK + 2) ? onFit : fitScored;
  // ★템플릿 제목을 뒤로 민다(2026-08-02 유저 화면: 보드 4장이 전부 템플릿이었다).
  //  원인은 max_tokens 초과로 응답 뒤쪽이 잘린 것인데, 잘린 항목은 템플릿 제목에 fit=1·ok=true가 붙어
  //  AI가 실제로 지은 제목과 '동등하게' 경쟁했다. 그래서 보드가 틀 문장으로 찼다.
  //  ★폴백은 마지막 보루여야지 후보가 되면 안 된다. 진짜 제목이 충분하면 템플릿은 쓰지 않는다.
  {
    const real = fitBase.filter(({ t }) => !t?.templated);
    if (real.length >= PICK) fitBase = real;
    else if (real.length) fitBase = [...real, ...fitBase.filter(({ t }) => t?.templated)]; // 모자라면 뒤에 붙여 빈자리만 메움
  }
  // ★계측(2026-07-31) — 풀 147건이 살아남았는데 보드가 0장인 사고. 진단이 poolSteps와 finalGate 사이에서 끊겨 있어
  //  '어느 마디에서 증발했는지'를 특정할 수 없었다(finalGateDrops=[] + poolCards=0 = 게이트에 아무것도 안 들어갔다는 뜻).
  //  제목·손님매칭 단계(keywordsToTitles)가 전량 ok:false를 내면 정확히 이 증상이 된다 — 그 가설을 숫자로 확인한다.
  // ★경쟁 분류 계측(2026-07-31) — 이번 사고에서 poolSteps(147)와 candidates2(3) 사이가 깜깜해 진범을 두 번에 나눠 찾았다.
  if (debugMode) diag.compSplit = { rows: rows.length, low: low.length, mid: mid.length, high: high.length, candidates: candidates.length, adminBest };
  if (debugMode) diag.titleStep = {
    candidates2: candidates2.length,
    titled: titled.length,
    okFalse: titled.filter((t) => t?.ok === false).length,
    staleTitle: titled.filter((t) => staleYear(t?.title ?? "")).length,
    fitZero: titled.filter((t) => (t?.fit ?? 1) < 1).length,
    fitScored: fitScored.length,
    onFit: onFit.length,
    fitBase: fitBase.length,
  };
  let fitTop = fitBase
    .sort((a, b) => (b.t?.fit ?? 1) - (a.t?.fit ?? 1))
    .slice(0, adminBest ? PICK + 14 : PICK + 6);

  // ── 진짜 콘텐츠 경쟁(blog_total) 채우기 (fitTop 전체) ──
  // 미수집(null)이면 네이버 블로그검색 1회 → 풀에 캐싱(전 유저 공용). 첫 1회만 호출, 이후 캐시.
  // ★한꺼번에 던지지 않는다(2026-08-04 유저 화면에서 검거: 신생 보드에 '경쟁 높음' 카드 2장).
  //  종전엔 fitTop 13~20개를 Promise.all로 동시에 쏴서 네이버가 429로 끊었다 → 측정 실패 → blog_total이
  //  null로 남고 → ①문서수 컷이 걸 대상이 사라지고 ②화면 경쟁도가 광고경쟁(compIdx) 폴백으로 표시됐다.
  //  ★같은 실수를 백필에서 먼저 했다(동시성 6에서 12연속 실패). 여기가 같은 병이었는데 증상만 달랐다.
  const measureDiag = { need: 0, ok: 0, fail: 0, cutShort: false, reasons: {} as Record<string, number> };
  {
    // ★한 요청에서 재는 개수를 제한한다(2026-08-05 유저 실측: 기본 경로가 504로 죽었다).
    //  창고를 채우는 건 백필 크론의 몫이다 — 서빙은 '지금 보여줄 것'만 재고 나머지는 다음으로 넘긴다.
    const MEASURE_CAP = 8;
    const MEASURE_MS = 6000; // 이 요청에서 측정에 쓸 시간 상한
    const startedMeasure = Date.now();
    const need = fitTop.filter(({ r }) => r.blog_total == null).slice(0, MEASURE_CAP);
    measureDiag.need = need.length;
    const CONC = 3;
    for (let i = 0; i < need.length; i += CONC) {
      const got = await Promise.all(need.slice(i, i + CONC).map(async ({ r }) => ({ r, d: await fetchBlogTotalDetailed(r.keyword) })));
      const writes: PromiseLike<unknown>[] = [];
      for (const { r, d } of got) {
        if (d.total == null) {
          measureDiag.fail += 1;
          const k = d.reason ?? "?"; measureDiag.reasons[k] = (measureDiag.reasons[k] ?? 0) + 1;
          continue;
        }
        measureDiag.ok += 1;
        r.blog_total = d.total;
        writes.push(pool.from("keyword_pool").update({ blog_total: d.total }).eq("keyword", r.keyword).then(() => null, () => null));
      }
      if (writes.length) await Promise.all(writes);
      if (Date.now() - startedMeasure > MEASURE_MS) { measureDiag.cutShort = true; break; }
      if (i + CONC < need.length) await new Promise((res) => setTimeout(res, 120));
    }
    if (measureDiag.fail) console.log(`[doc-measure] 필요 ${measureDiag.need} · 성공 ${measureDiag.ok} · 실패 ${measureDiag.fail} ${JSON.stringify(measureDiag.reasons)}`);
  }

  // ★밴드 문서수 컷(2026-08-04 유저 실측에서 검거 — 신생 보드에 문서수 29,407·40,867·49,280 카드가 섰다)
  //  종전 주석은 "미측정(null)은 통과 — 측정 후 별점이 거른다"였는데, 별점은 거르지 않는다. 정렬 가중치일 뿐이다.
  //  ★사고의 전체 그림: 쿼리 시점엔 blog_total이 null이라 밴드 상한을 통과 → 바로 위에서 그 자리에서 측정 →
  //   4만짜리가 붙었는데 컷이 없어 그대로 화면에 섰다. 그리고 측정값이 DB에 캐시되니 나중에 재면 위반 0건으로
  //   보인다(pool-quality가 "이 경로는 깨끗하다"고 답한 이유 — 위반은 쿼리 뒤에 만들어진다).
  //  ★유저 확정 정책: 상한 초과는 탈락시키되, 자리가 남으면 '문서수 적은 순'으로만 보충한다(보드는 비우지 않는다).
  //   단 절대 상한 위는 무조건 제외 — 신생 계정이 못 이기는 판이면 자리를 채울 값어치가 없다.
  //  ★판정은 lib/topicScore.applyDocCut 한 곳에만 둔다 — 같은 규칙을 두 곳에서 계산하면 반드시 어긋난다.
  {
    const tbCut = FF.tierBands ? TIER_BANDS[tierInfo?.tier ?? "SEEDLING"] : null;
    const docMax = tbCut?.blogTotalMax ?? null;
    if (docMax != null) {
      const need = (tailMode === "long" ? 10 : PICK) + 4; // 뒤 단계(중복·유사 배제)가 깎을 몫까지 여유
      const cut = applyDocCut(fitTop, (x) => x.r.blog_total, { docMax, need });
      if (debugMode) diag.docMeasure = measureDiag;
      if (debugMode) diag.docCut = { docMax, hardMax: DOC_HARD_MAX, before: fitTop.length, within: cut.within, over: cut.over, refilled: cut.refilled, dropped: cut.dropped, refillMax: cut.kept.reduce((m, x) => Math.max(m, x.r.blog_total ?? 0), 0) };
      if (cut.dropped > 0 || cut.refilled > 0) console.log(`[doc-cut] tier=${tierInfo?.tier ?? "SEEDLING"} max=${docMax} 통과 ${cut.within} · 보충 ${cut.refilled} · 탈락 ${cut.dropped}`);
      fitTop = cut.kept;
    }
  }

  // ★핵심 축 유지 — 네이버 공식 '주제 전문성·일관성': 초반엔 한 우물이 전문 출처 인식에 유리.
  // 유저가 이미 쓴 글 키워드의 토큰(불용어 제외)을 축으로 삼아, 같은 축 후보에 가산점(별 반 개 수준 — 선점을 뒤집진 않음).
  const AXIS_STOP = new Set(["추천", "방법", "후기", "비교", "정리", "순위", "가격", "종류", "하는법", "이유", "총정리"]);
  const axisTokens = new Set<string>();
  if ((mine ?? []).length >= 2) {
    for (const a of mine ?? []) {
      for (const tok of String(a.keyword ?? "").split(/\s+/)) {
        if (tok.length >= 2 && !AXIS_STOP.has(tok)) axisTokens.add(tok);
      }
    }
  }
  const axisBoost = (kw: string): number => {
    if (axisTokens.size === 0) return 0;
    for (const tok of axisTokens) if (kw.includes(tok)) return 5;
    return 0;
  };

  // '이길 수 있는(선점 높은)' 순으로 PICK개 — 선점 우선, 축 가산, fit 미세 가산. blog_total 없으면 중간(3) 취급.
  // 후보 집합은 매일 시드로 달라지므로(변동성) 그날의 후보 중 가장 winnable한 걸 보여준다.
  // ★SERP 성격 보정(2026-07-15 유저 승인 — 200키워드 실측 자료): 정답형(공식 DB 상단 잠식)은 별 한 개 가까이 감점,
  //  경험형(비용·후기·비교 — 블로그가 SERP를 채움)은 가점. '계산기'는 finalGate에서 하드컷.
  // AI 브리핑 종결형(여부·시점 단답)은 요약으로 끝나 클릭이 안 남는다 — 정답형과 같은 결로 감점(2026-07-17 전략 회의)
  const serpAdj = (kw: string): number => (ANSWER_LOCKED_RE.test(kw) ? -8 : 0) + (AI_BRIEF_ENDED_RE.test(kw) ? -6 : 0) + (EXPERIENCE_RE.test(kw) ? 4 : 0);
  // ★요일 축(2026-07-31 실측) — 금·토·일엔 영업일 실행형 글감을 감점한다(정기예금 특판 48%·IRP 이전 49%).
  //  KST 기준 요일. UTC로 계산하면 자정~오전 9시에 '어제' 요일이 되어 주말 판정이 하루 밀린다.
  const kstDow = new Date(Date.now() + 9 * 3600_000).getUTCDay();
  const winScore = ({ r, t }: { r: PoolRow; t?: { fit?: number } }) =>
    (r.blog_total != null ? filledStarsFromData(r.monthly_searches ?? 0, r.blog_total) : 3) * 10 + axisBoost(r.keyword) + serpAdj(r.keyword) + weekendAdjust(r.keyword, kstDow) + (t?.fit ?? 1);
  // ★진짜 경쟁(문서수) '높음'은 원칙적으로 안 보여준다 — 유저가 어차피 거른다. 낮음·중간 소진 시에만 폴백.
  const realCompOf = (r: PoolRow): Comp => (r.blog_total != null ? compFromBlogTotal(r.blog_total) : compFromLabel(r.competition));
  // 제목 중복 제거 + 소주제 클러스터 라운드로빈 — 비슷한 글감(영문법변환기 3개) 몰림 방지, 골고루 다양하게.
  type FitItem = (typeof fitTop)[number];
  const winnable = fitTop.filter((x) => realCompOf(x.r) !== "high");
  const saturated = fitTop.filter((x) => realCompOf(x.r) === "high");
  const sortedFit: FitItem[] = [
    ...winnable.sort((a, b) => winScore(b) - winScore(a)),
    ...saturated.sort((a, b) => winScore(b) - winScore(a)),
  ];
  const byCluster = new Map<string, FitItem[]>();
  const seenTitle = new Set<string>();
  for (const item of sortedFit) {
    const tkey = normalizeKeyword(item.t?.title ?? item.r.keyword);
    if (seenTitle.has(tkey)) continue; // 같은/비슷한 제목 제거
    seenTitle.add(tkey);
    const ck = clusterKey(item.r.keyword);
    const arr = byCluster.get(ck);
    if (arr) arr.push(item); else byCluster.set(ck, [item]);
  }
  const clusters = [...byCluster.values()]; // 각 클러스터는 winScore 내림차순
  const pickN = tailMode === "long" ? 10 : PICK; // long 탭=풀 10개(유저: 왕창)
  // ★유사 코어 중복 배제(2026-07-13 실측: '신협 정기예금금리'와 '저축은행 정기예금금리' 동시 노출 — 접두 4자 클러스터가 기관명에 속음)
  //  5자+ 연속 공유(정기예금금리급)면 같은 검색자군으로 보고 한 판에 하나만.
  const grams5 = (t: string) => { const nk = normalizeKeyword(t); const g = new Set<string>(); for (let i = 0; i + 5 <= nk.length; i++) g.add(nk.slice(i, i + 5)); return g; };
  const tooSimilar = (a: string, b: string) => { const ga = grams5(a); for (const g of grams5(b)) if (ga.has(g)) return true; return false; };
  const generalRows: FitItem[] = [];
  while (generalRows.length < pickN && clusters.some((c) => c.length)) {
    for (const c of clusters) { // 클러스터별로 하나씩 → 소주제 골고루
      if (generalRows.length >= pickN) break;
      const top = c.shift();
      if (!top) continue;
      if (generalRows.some((p) => tooSimilar(p.r.keyword, top.r.keyword))) continue; // 유사 코어 — 이번 판 제외
      generalRows.push(top);
    }
  }
  // ★무조건 PICK개 채우기 — 필터(연도·경쟁·클러스터 중복)로 모자라면 남은 후보에서 보충.
  //  카드가 2개, 1개로 줄어드는 화면은 신뢰를 깎는다(빈자리 금지).
  if (generalRows.length < PICK) {
    const usedKw = new Set(generalRows.map((g) => normalizeKeyword(g.r.keyword)));
    for (const pass of [0, 1]) { // 0차=비유사만, 1차=그래도 모자라면 유사 허용(빈자리 금지)
      for (const item of sortedFit) {
        if (generalRows.length >= PICK) break;
        const nk = normalizeKeyword(item.r.keyword);
        if (usedKw.has(nk)) continue;
        if (pass === 0 && generalRows.some((p) => tooSimilar(p.r.keyword, item.r.keyword))) continue;
        usedKw.add(nk); generalRows.push(item);
      }
    }
  }

  // comp는 blog_total(진짜 콘텐츠 경쟁) 있으면 그걸로, 없으면 광고경쟁 폴백. region 모드면 '우리 동네' 칩.
  const topics = generalRows.map(({ r, t }) => {
    const realComp: Comp = r.blog_total != null ? compFromBlogTotal(r.blog_total) : compFromLabel(r.competition);
    return {
      keyword: r.keyword,
      title: t?.title ?? r.keyword,
      demandLabel: demandLabel(r.monthly_searches, type),
      ssak: realComp === "low",
      region: regionMode,
      tone: type,
      vol: r.monthly_searches ?? 0,
      comp: realComp,
      blogTotal: r.blog_total ?? null,
      bidHigh: bidHigh(r), // ★단가 높음(카테고리 상대) — 배지용
      tag: t?.tag || sub || "글감", // 칩 항상 표시 — AI 분류 없으면 세부업종으로 폴백
      // ★정답형 경고 배지(SERP 실측 자료) — 컷은 아니지만 유저가 고를 때 알고 고르게
      ...(ANSWER_LOCKED_RE.test(r.keyword)
        ? { demandBadge: "공식 사이트가 상단을 차지하기 쉬운 유형 — 후순위 추천" }
        : AI_BRIEF_ENDED_RE.test(r.keyword)
          ? { demandBadge: "AI 요약으로 끝나기 쉬운 유형 — 후순위 추천" }
          : {}),
      // ★성과 루프(FF_PERF_LOOP) — 에버그린 선별 당시 실측값 운반
      ...(FF.perfLoop ? { sel: { species: "evergreen", seedSource: "pool", cluster: clusterKey(r.keyword), vol: r.monthly_searches ?? 0, blogTotal: r.blog_total ?? null, stars: r.blog_total != null ? filledStarsFromData(r.monthly_searches ?? 0, r.blog_total) : null } } : {}),
      // ★수익 경로 태그(FF_REVENUE_TAG §6) — 표시용, 선별 점수 무관
      ...(FF.revenueTag ? (() => { const rp = revenuePathOf({ keyword: r.keyword, title: t?.title ?? null, adDepth: r.ad_depth ?? null }); return rp === "none" ? {} : { revenuePath: rp, revenueLabel: REVENUE_TAG_LABEL[rp as Exclude<RevenuePath, "none">] }; })() : {}),
    };
  });
  // ★실시간 트렌드 글감 — 카테고리 공유 풀(크론이 뉴스+웹검색으로 채움)에서 유저별 시드 회전으로 뽑는다.
  //  '그날 그시간' 신선함이 홈판 노출의 핵심. 1만 명이 같은 풀을 봐도 시드 회전으로 다른 조각을 봄.
  // ★홈 경로 트렌드 카드도 최종 검문(2026-07-24 실측: 'B2B 스타트업 정책자금'이 홈 보드에 노출 — 단기 탭만 finalGate라 홈은 무검문 누출).
  const trendCardsRaw = await buildTrendCards(new Set(topics.map((x) => normalizeKeyword(x.keyword))));
  const trendGate = finalGate(trendCardsRaw);
  if (trendGate.drops.length) console.log("[final-gate:home-trend]", JSON.stringify(trendGate.drops));
  const trendCards = trendGate.pass;

  // ★헤드 배팅 슬롯(2026-07-15 유저 확정: 밴드 사다리) — 신생·성장 tier에 한 판 1장, 한 밴드 위 키워드.
  //  지금 순위는 안 나와도 에버그린 자산 — 체급이 오르면 이 글이 뒤늦게 일한다. 실패·후보 없음=조용히 0장.
  let headBetCards: typeof topics = [];
  // ★N장으로 확장(2026-08-01): .find()로 1장만 만들어서 성장기 15%·확장기 30% 배합이 구조적으로 달성 불가였다.
  //  ESTABLISHED 제외 조건도 풀었다 — 확장기는 헤드가 주력(30%)인데 0장이 나오던 모순.
  if (FF.tierBands && FF.tierMix && tierInfo) {
    try {
      const cur = TIER_BANDS[tierInfo.tier];
      // 확장기는 '한 밴드 위'가 없으므로 상단을 열어 준다(그 위가 곧 헤드다).
      const upMax = tierInfo.tier === "SEEDLING" ? TIER_BANDS.GROWING.volMax
        : tierInfo.tier === "GROWING" ? (TIER_BANDS.ESTABLISHED.volMax ?? 30000)
        : 100_000;
      const headWant = Math.max(1, columnQuota(tierInfo.tier, "long", COLUMN_SIZE.long).head);
      let hq = pool.from("keyword_pool").select("keyword, monthly_searches, competition, audience, blog_total")
        .eq("vertical", vertical).gt("monthly_searches", cur.volMax).lte("monthly_searches", upMax)
        .order("times_assigned", { ascending: true }).order("monthly_searches", { ascending: false }).limit(40);
      if (sub) hq = hq.eq("sub", sub);
      const { data: hd } = await hq;
      const picksH = ((hd ?? []) as PoolRow[]).filter((r) =>
        !usedSet.has(normalizeKeyword(r.keyword)) && audMatch(r.keyword, r.audience) && finalGate([{ keyword: r.keyword, title: r.keyword }]).pass.length > 0)
        .slice(0, headWant);
      headBetCards = picksH.map((pickH) => ({
          keyword: pickH.keyword, title: pickH.keyword,
          demandLabel: demandLabel(pickH.monthly_searches, type),
          ssak: false, region: false, tone: type,
          vol: pickH.monthly_searches ?? 0,
          comp: pickH.blog_total != null ? compFromBlogTotal(pickH.blog_total) : compFromLabel(pickH.competition),
          blogTotal: pickH.blog_total ?? null,
          bidHigh: bidHigh(pickH),
          tag: sub || "글감",
          demandBadge: "헤드 배팅 — 지금 체급엔 크지만, 블로그가 크면 이 글부터 일해요",
          ...(FF.perfLoop ? { sel: { species: "evergreen", seedSource: "headbet", vol: pickH.monthly_searches ?? 0, blogTotal: pickH.blog_total ?? null, stars: pickH.blog_total != null ? filledStarsFromData(pickH.monthly_searches ?? 0, pickH.blog_total) : null } } : {}),
        } as unknown as (typeof topics)[number]));
      if (debugMode) diag.headBet = { want: headWant, got: headBetCards.length };
    } catch { /* 헤드 배팅 실패 — 기존 파이프 무영향 */ }
  }

  // ★홈판 레인(FF_HOMEFEED_BET) — 검색이 아니라 홈피드 폭발을 노린다.
  //  2026-07-15 '1일 1장' → 2026-08-01 배합 정식 레인(신생 40%). 8유형 로테이션(사실 기반만 + 시장 번역·격차 자극).
  //  근거: 편당 조회 150 → 목표는 1,500. 검색 니치는 월 수요 300~800이 천장이라 산수가 안 맞는다(2026-08-01 실측).
  let homefeedCards: TrendCard[] = [];
  if (FF.homefeedBet && tailMode !== "long") {
    try {
      // ★열 쿼터와 같은 n을 쓴다 — 다르면 캐시 키(homebet:...:n)가 갈라져 같은 날 LLM 생성이 두 번 돈다.
      const bets = await pickHomefeedBets(pool, user.id, sub ?? "", usedSet, columnQuota(tierInfo?.tier ?? "SEEDLING", "short", COLUMN_SIZE.short).homefeed, {
        // ★두 경로가 같은 재료를 받아야 한다 — 한쪽만 소재 차단을 하면 경로에 따라 다른 카드가 나온다
        recentKeywords: recent14.map((a) => String(a.keyword ?? "")).filter(Boolean).slice(0, 30),
      });
      homefeedCards = bets
        .filter((bet) => !usedSet.has(normalizeKeyword(bet.keyword)) && finalGate([{ keyword: bet.keyword, title: bet.title }], { anchorKeyword: true }).pass.length > 0)
        .map((bet) => ({
          keyword: bet.keyword, title: bet.title,
          demandLabel: `홈판 배팅 · ${bet.betType}`,
          ssak: true, region: false, tone: type, vol: 0, comp: "low" as Comp, blogTotal: null,
          // ★출처 노출(2026-08-03 유저 요청) — 화면이 '출처 이슈: …'로 렌더한다. 실데이터 카드인지 눈으로 확인 가능하게.
          tag: "홈판", briefText: bet.briefText, sourceTitle: bet.sourceTitle,
          thumb: { mainCopy: bet.thumbCopy, subCopy: "", badge: "홈판" },
          demandBadge: "터지면 상한 없음 — 승부는 검색량이 아니라 반응(공감·저장)",
          ...(FF.perfLoop ? { sel: { species: "homefeed", seedSource: "homebet", sourceTitle: bet.sourceTitle ?? null, cluster: clusterKey(bet.keyword), hookKey: bet.betType } } : {}),
        } as TrendCard));
    } catch { /* 홈판 배팅 실패 — 조용히 0장 */ }
  }

  // 트렌드(신선) 먼저, 데이터 글감은 섞어서 뒤에. 지역 카드는 섞임.
  // ★수익 증폭 카드(최우선 후보) — ①활성 시리즈 다음 화 ②hot(반응 좋아요) 단발의 후속.
  //  '더 뜨거운 이슈 인터럽트'는 클라 랭크(pickNextTopic)가 판단할 수 있게 tag로 구분만 한다. 실패=조용히 생략.
  const boostCards: typeof trendCards = [];
  try {
    const activeBlogId = (profile as { id?: string } | null)?.id ?? null;
    let srQ = supabase.from("user_series").select("id, title, keyword, arc, total, next_ep, blog_id").eq("user_id", user.id).eq("status", "active");
    if (activeBlogId) srQ = srQ.or(`blog_id.eq.${activeBlogId},blog_id.is.null`);
    const { data: sr } = await srQ.order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (sr && sr.next_ep <= sr.total) {
      const ep = (sr.arc as { role: string; angle: string }[])[sr.next_ep - 1];
      boostCards.push({ keyword: sr.keyword, title: ep?.angle ?? `${sr.title} ${sr.next_ep}화`, demandLabel: "시리즈 이어쓰기", ssak: true, region: false, tone: "online", vol: 0, comp: "low" as Comp, blogTotal: null, tag: "series", newsContext: undefined, titleSearch: undefined, briefText: undefined, hookKey: undefined, thumb: undefined, brief: undefined, seriesId: sr.id, seriesBadge: `시리즈 ${sr.next_ep}/${sr.total}` } as (typeof trendCards)[number] & { seriesId: string; seriesBadge: string });
    } else {
      const twoDays = new Date(Date.now() - 48 * 3600_000).toISOString();
      let hotQ = supabase.from("articles").select("keyword, title").eq("user_id", user.id).is("series_id", null).gte("hot_at", twoDays);
      if (activeBlogId) hotQ = hotQ.or(`blog_id.eq.${activeBlogId},blog_id.is.null`);
      const { data: hot } = await hotQ.order("hot_at", { ascending: false }).limit(1).maybeSingle();
      if (hot) {
        boostCards.push({ keyword: hot.keyword, title: `${hot.keyword}, 한 걸음 더 들어가기`, demandLabel: "어제 반응 좋았던 글의 후속", ssak: true, region: false, tone: "online", vol: 0, comp: "low" as Comp, blogTotal: null, tag: "followup", newsContext: undefined, titleSearch: undefined, briefText: (/마감|신청|모집|접수|\d+차/.test(`${hot.keyword} ${hot.title}`)
          ? `[후속 지시 — 회차 환생 패턴(실측: 1차 마감 후 '2차' 검색 폭발)] 전작 "${hot.title}"이 반응이 좋았고, 마감·신청형 주제다. 후속은 '다음 회차·추가 모집·지급일·발표일·못 받은 경우' 같은 마감 이후 검색 의도에 정확히 답한다(전작 요약 재탕 금지). 도입 직후 [전편 링크 자리] 마커 1회.`
          : `[후속 지시] 전작 "${hot.title}"이 반응이 좋았다. 같은 검색 의도의 심화·확장편을 쓴다(중복 서술 금지 — 전작이 못 다룬 다음 질문에 답한다). 도입 직후 [전편 링크 자리] 마커 1회.`), hookKey: undefined, thumb: undefined, brief: undefined } as (typeof trendCards)[number]);
      }
    }
  } catch { /* 0054 미적용 등 — 조용히 생략 */ }

  // ★파생 급상승 레이더(실측: 청년미래적금 본편 발행 다음날 '가구원 동의'가 진짜 폭발 지점 — 이벤트는 연작이다)
  //  최근 48h 발행 키워드의 자동완성을 지금 다시 긁어, 마찰·절차 파생어가 새로 떠 있으면 최우선 후속 카드로.
  try {
    if (boostCards.length < 2) {
      const twoDays2 = new Date(Date.now() - 48 * 3600_000).toISOString();
      const activeBlogId2 = (profile as { id?: string } | null)?.id ?? null;
      let pubQ = supabase.from("articles").select("keyword, title").eq("user_id", user.id).in("status", ["copied", "pending_verify", "verified", "published"]).gte("created_at", twoDays2);
      if (activeBlogId2) pubQ = pubQ.or(`blog_id.eq.${activeBlogId2},blog_id.is.null`);
      const { data: pubs } = await pubQ.order("created_at", { ascending: false }).limit(2);
      const FRICTION = /(동의|서류|심사|자격|거부|탈락|거절|방법|기간|발표|지급|해지|변경|취소|조건|한도|후기|수령)/;
      const acResults = await Promise.race([
        Promise.all((pubs ?? []).map(async (pb) => ({ pb, acs: await fetchNaverAutocomplete(String(pb.keyword ?? "").trim()).catch(() => [] as string[]) }))),
        new Promise<{ pb: { keyword: string | null; title: string | null }; acs: string[] }[]>((r) => setTimeout(() => r([]), 2000)),
      ]); // ★병렬+2초 캡(실측: 새벽 로딩 지연)
      for (const { pb, acs } of acResults) {
        const base = String(pb.keyword ?? "").trim();
        if (!base) continue;
        const root = base.split(" ")[0] ?? base;
        const derived = acs.filter((a) => a !== base && a.startsWith(root) && FRICTION.test(a.replace(base, "")) && !usedSet.has(normalizeKeyword(a)) && !excludeSet.has(normalizeKeyword(a)));
        const pick = derived[0];
        if (pick) {
          boostCards.unshift({ keyword: pick, title: `${pick}, 지금 다들 이게 궁금해요`, demandLabel: "내 글에서 파생된 실검색 급상승", ssak: true, region: false, tone: "online" as BloggerType, vol: 0, comp: "low" as Comp, blogTotal: null, tag: "followup", newsContext: undefined, titleSearch: undefined, briefText: `[파생 급상승 지시] 전작 "${pb.title}"(키워드: ${base})을 본 뒤 사람들이 지금 실제로 검색하는 파생 질문이 "${pick}"이다(네이버 자동완성 실측). 이 파생 질문 하나에만 완결로 답하라 — 특히 불안(개인정보·불이익·거절 사유)이 깔린 질문이면 첫 두 문장에서 그 불안부터 해소한다. 전작 요약 재탕 금지, 도입 직후 [전편 링크 자리] 마커 1회.`, hookKey: undefined, thumb: undefined, brief: undefined } as (typeof trendCards)[number]);
          break; // 하루 1개 — 과속 금지
        }
      }
    }
  } catch { /* 조용히 생략 */ }

  // ★계측(2026-07-31) — 조립 마디. fitTop 이후 어디서 카드가 사라지는지(클러스터 배분·유사 배제·보충 폴백).
  if (debugMode) diag.assembleStep = { fitTop: fitTop.length, sortedFit: sortedFit.length, clusters: clusters.length, pickN, generalRows: generalRows.length, topics: topics.length };
  const shuffled = shuffle(topics, rng);
  // ★밴드 불변식(2026-07-20 최종 검문 — 실측: 봉쇄 후에도 6,950~26,180 노출, 출처 미상): 어떤 경로로 왔든
  //  응답 직전 검색량이 밴드 상한 1.5배 초과 카드는 차단, 차단 내역은 api_cache(diag:band_leak)에 자수 기록.
  // ★근접 중복 최종 차단(2026-07-24 유저: "빡세게") — 어느 버킷(트렌드·에버그린·부스트·헤드)에서 왔든
  //  사실상 같은 글감(수식어만 다른 CMA추천 ↔ CMA통장추천)은 한 판에 하나만. 앞선(우선순위 높은) 카드를 남긴다.
  const dedupeBoard = <T extends { keyword?: string; title?: string }>(list: T[]): T[] => {
    const kept: T[] = [];
    for (const c of list) {
      const kw = String(c.keyword ?? ""), ti = String(c.title ?? "");
      const dup = kept.some((k) => {
        const kkw = String(k.keyword ?? ""), kti = String(k.title ?? "");
        // ★같은 상품군까지 본다(2026-08-02 실측: '연금펀드'와 '연금저축펀드'가 한 판에 같이 떴다).
        //  nearDuplicate는 인픽스 '저축'을 못 넘었고 제목 유사도는 0.39로 낮았다 — 그 사이를 메운다.
        return nearDuplicate(kw, kkw) || nearDuplicate(ti, kti) || nearDuplicate(kw, kti) || nearDuplicate(ti, kkw)
          || sameProductFamily(kw, kkw);
      });
      if (!dup) kept.push(c);
    }
    return kept;
  };
  if (tailMode === "long") {
    const g = finalGate(shuffled as { keyword: string; title: string }[]);
    if (g.drops.length) console.log("[final-gate:long]", JSON.stringify(g.drops));
    if (debugMode) diag.finalGateDrops = g.drops;
    // ★'꾸준한 수요' 열 = 황금 + 헤드 레인(2026-08-01 열↔레인 매핑). 이 열은 검색 자산 게임이다.
    //  종전엔 헤드 배팅이 tailMode!=='long'으로 막혀 이 열에 아예 못 들어왔다 — 헤드 배합이 화면에 도달할 길이 없었다.
    const colLong = columnQuota(tierInfo?.tier ?? "SEEDLING", "long", COLUMN_SIZE.long);
    const goldenPass = dedupeBoard(bandInvariant(g.pass, "long"));
    const headsLong = (headBetCards as typeof goldenPass).slice(0, colLong.head);
    // 황금을 먼저, 헤드는 뒤 — 앞에서 잘려도 자산 레인이 먼저 남는다. 부족분은 서로 메운다.
    const passLong = dedupeBoard([
      ...goldenPass.slice(0, colLong.golden),
      ...headsLong,
      ...goldenPass.slice(colLong.golden), // 예비(헤드가 0장이거나 중복 제거로 빌 때 채운다)
    ]);
    if (debugMode) diag.colLong = { ...colLong, goldenGot: goldenPass.length, headGot: headsLong.length };
    await writeDiag();
    const passLongS = stampSlots(passLong);
    return NextResponse.json(debugMode ? { topics: passLongS, diag: { ...diag, mode: "long", poolCards: g.pass.length, slots: slotCount(passLongS) } } : { topics: passLongS, ...(FF.perfLoop ? { ff: { perfLoop: true } } : {}), ...(FF.tierBands && tierInfo ? { tier: { name: tierInfo.tier, note: tierInfo.note } } : {}) });
  }
  // ★tier별 종족 비율(FF_TIER_MIX §4) — 상위 10슬롯의 트렌드:에버그린 배분. 별도 레이어:
  //  boost(시리즈·후속) 최우선 고정, 트렌드 내부 순서(공고 쿼터 포함)와 에버그린 내부 순서는 무수정 — 충돌 시 기존 규칙 승리.
  let finalList = [...boostCards, ...homefeedCards, ...trendCards, ...bandInvariant(shuffled, "home")];
  if (FF.tierMix && tierInfo) {
    // ★4분할 배합(2026-08-01 유저 확정) — 구 2분할 [트렌드,에버그린]은 신생 트렌드 70%였다(설계는 25%).
    //  그 결과 신생 보드에 헤드가 꽂혔고 7/31 발행 5편이 전부 노출 0이었다(실측). 이제 레인별 쿼터로 자른다.
    const q = dayQuota(tierInfo.tier, 0);
    const trends = [...trendCards].slice(0, q.trend);
    const evers = [...shuffled].slice(0, q.golden);
    const heads = (headBetCards as typeof finalList).slice(0, q.head);
    const homes = homefeedCards.slice(0, q.homefeed);
    // 황금(에버그린)을 뼈대로 두고 트렌드를 사이사이 끼운다 — 홈판·헤드는 배팅이라 앞뒤 고정.
    // ★레인을 균등 간격으로 인터리브한다(2026-08-01 이중체크 수리 — 랜드마인 제거 + 앞자름 내성).
    //  종전엔 `e.shift() ?? mixed[last]`가 있어, 조건이 어긋나면 직전 카드를 한 번 더 밀어 넣는 중복 버그가
    //  잠재해 있었다(현재 도달 불가였지만 조건 하나만 바뀌면 터진다). 그리고 홈판을 앞에 몰아넣으면
    //  화면이 앞 5장만 자를 때 다른 레인이 통째로 사라진다 — 그래서 몰지 않고 고르게 편다.
    const weave = (lanes: { cards: typeof finalList; step: number }[]): typeof finalList => {
      const out: typeof finalList = [];
      const q2 = lanes.map((l) => ({ cards: [...l.cards], step: l.step, next: 0 }));
      while (q2.some((l) => l.cards.length)) {
        const live = q2.filter((l) => l.cards.length);
        live.sort((a, b) => a.next - b.next);
        const pick = live[0]!;
        out.push(pick.cards.shift()!);
        pick.next += pick.step; // step이 작을수록 자주 나온다(장수가 많은 레인)
      }
      return out;
    };
    const stepOf = (n: number) => (n > 0 ? 1 / n : Number.POSITIVE_INFINITY);
    const mixed = weave([
      { cards: homes, step: stepOf(homes.length) },
      { cards: evers, step: stepOf(evers.length) },
      { cards: trends, step: stepOf(trends.length) },
      { cards: heads, step: stepOf(heads.length) },
    ]);
    // 남은 카드는 쿼터 밖 예비 — 앞쪽이 소진(중복 제거·게이트 탈락)됐을 때만 쓰인다.
    const spare = [...trendCards.slice(q.trend), ...shuffled.slice(q.golden)];
    finalList = [...boostCards, ...mixed, ...spare];
    // ★쿼터 미달을 조용히 넘기지 않는다 — 홈판 생성이 통째로 실패해도 예비가 채워 버려서 아무도 몰랐다.
    const short = { golden: q.golden - evers.length, homefeed: q.homefeed - homes.length, trend: q.trend - trends.length, head: q.head - heads.length };
    const missing = Object.entries(short).filter(([, v]) => v > 0);
    if (missing.length) console.log(`[lane-quota] 미달 ${JSON.stringify(Object.fromEntries(missing))} — 예비 카드가 대신 채웠다(배합 비율 붕괴)`);
    if (debugMode) diag.laneQuota = { want: q, got: { golden: evers.length, homefeed: homes.length, trend: trends.length, head: heads.length }, missing: Object.fromEntries(missing) };
  }
  finalList = dedupeBoard(finalList); // ★근접 중복 최종 차단(전 버킷 교차)
  await writeDiag();
  finalList = stampSlots(finalList);
  return NextResponse.json(debugMode ? { topics: finalList, diag: { ...diag, slots: slotCount(finalList), boost: boostCards.length, trendCards: trendCards.length, poolCards: shuffled.length } } : { topics: finalList, ...(FF.tierBands && tierInfo ? { tier: { name: tierInfo.tier, note: tierInfo.note } } : {}) });
}
