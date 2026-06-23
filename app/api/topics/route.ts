import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { keywordsToTitles } from "@/lib/topicTitles";
import { normalizeKeyword } from "@/lib/diversity";
import { audienceOf, AUDIENCE_ALL } from "@/lib/audience";
import { isUnsafeKeyword } from "@/lib/keywordSafety";
import { regionLevel, extractRegions, isLocalBusiness, buildLocalSeeds } from "@/lib/region";
import { bloggerType, type BloggerType } from "@/lib/bloggerTypes";
import { compFromLabel, compFromBlogTotal, type Comp } from "@/lib/topicScore";
import { fetchBlogTotal } from "@/lib/naverBlogSearch";
import { expandLocalAreas } from "@/lib/aiSeeds";
import { buildPoolForSub } from "@/lib/keywordPool";
import { collectPoolKeywords } from "@/lib/poolCollect";
import { checkRateLimit } from "@/lib/rateLimit";

// 사장의 blog_profile(vertical + sub_category)로 keyword_pool에서 글감 3개를 뽑는다.
// Stage 2-B 분산: ① least-used 우선(times_assigned asc) ② 본인이 이미 쓴 키워드 제외 ③ 그 안 랜덤.
export const dynamic = "force-dynamic";
export const maxDuration = 60; // 신규 카테고리 첫 요청은 lazy-fill(네이버 수집)이 요청 안에서 돌아 시간 필요

const PICK = 3;
const WINDOW = 150; // least-used 윈도우 크기 — 이 안에서 랜덤(반복 많으면 키우고, 마이너 자주 뜨면 줄임)

interface PoolRow { keyword: string; monthly_searches: number | null; competition: string | null; audience: string | null; blog_total: number | null }

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

export async function GET(req: Request) {
  // 인증·프로필은 유저 클라이언트(RLS) — 본인 확인 + 본인 프로필만 읽음.
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const { data: profile } = await supabase
    .from("blog_profiles")
    .select("vertical, sub_category, audience, biz_address")
    .eq("user_id", user.id)
    .maybeSingle();

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
  const { data: mine } = await supabase.from("articles").select("keyword").eq("user_id", user.id);
  const usedSet = new Set((mine ?? []).map((a) => normalizeKeyword(String(a.keyword ?? ""))).filter(Boolean));
  // 카드별 교체('이 글감 별로예요') — 지금 보이는 글감들을 제외하고 새로 뽑는다.
  const exclude = (new URL(req.url).searchParams.get("exclude") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  for (const e of exclude) usedSet.add(normalizeKeyword(e));
  // 토픽 클러스터(주제 이어가기): 이 토큰이 든 키워드만 → 한 주제 깊이 파기. %_ 이스케이프.
  const cluster = (new URL(req.url).searchParams.get("cluster") ?? "").trim().replace(/[%_]/g, "").slice(0, 24);

  // keyword_pool은 공용 풀(RLS 정책 없음 = 서버 전용). 서비스롤로 읽는다(category_insights와 동일 패턴).
  // 유저별 비밀이 아닌 공용 데이터이고, 조회 조건은 위에서 본인 확인된 프로필 값(vertical/sub)뿐이라 안전.
  const pool = createSupabaseAdminClient();

  // least-used 우선 윈도우(times_assigned asc → 균등 분산). 본인이 쓴 건 제외 후 남은 것만.
  // 적정범위 = 월 500~5,000 (경쟁 과열·초저검색 회피). sub 없거나 부족하면 단계적으로 넓힌다.
  async function fetchPool(useSub: boolean, ranged: boolean): Promise<PoolRow[]> {
    let q = pool.from("keyword_pool").select("keyword, monthly_searches, competition, audience, blog_total").eq("vertical", vertical);
    if (useSub && sub) q = q.eq("sub", sub);
    if (cluster) q = q.ilike("keyword", `%${cluster}%`); // 클러스터: 이 토큰 든 키워드만
    if (ranged) q = q.gte("monthly_searches", 500).lte("monthly_searches", 5000);
    const { data } = await q
      .order("times_assigned", { ascending: true }) // 덜 쓰인 것 먼저(기존 인덱스 활용)
      .order("monthly_searches", { ascending: false })
      .limit(WINDOW);
    const rows = (data ?? []) as PoolRow[];
    // 본인 작성분 제외 + 고른 대상(audience)만 통과
    return rows.filter((r) => !usedSet.has(normalizeKeyword(r.keyword)) && !isUnsafeKeyword(r.keyword) && audMatch(r.keyword, r.audience));
  }

  // 단계적 폴백: (sub+적정범위) → (sub+전체) → (vertical+적정범위) → (vertical+전체).
  const steps: [boolean, boolean][] = sub
    ? (audActive ? [[true, true], [true, false]] : [[true, true], [true, false], [false, true], [false, false]])
    : [[false, true], [false, false]];
  let rows: PoolRow[] = [];
  for (const [useSub, ranged] of steps) {
    rows = await fetchPool(useSub, ranged);
    if (rows.length >= PICK) break;
  }

  // ── 게으른 풀 채우기 ──
  // 풀이 비거나(신규) '3개도 못 채울 만큼 얇으면'(빈약 카테고리) AI 시드 확장으로 풀을 키운다.
  // → 변동성·선점·3개 보장 확보. 이후 같은 업종은 풀에서 바로. 남용 방지 레이트리밋.
  if (rows.length < PICK && sub) {
    const seedRl = await checkRateLimit(supabase, user.id, "pool_seed", 6, 600);
    if (seedRl.ok) {
      try {
        await buildPoolForSub(vertical, sub, { sleepMs: 300 });
      } catch {
        /* 수집 실패해도 빈 결과로 진행 */
      }
      for (const [useSub, ranged] of steps) {
        rows = await fetchPool(useSub, ranged);
        if (rows.length >= PICK) break;
      }
    }
  }

  if (rows.length === 0) return NextResponse.json({ topics: [] });

  // ── 경쟁도 티어 ──
  // 낮음 = 싹 키워드(전설·희귀), 중간 = 일반(기본), 높음 = 빅키워드(최후)
  const comp = (r: PoolRow) => (r.competition ?? "").trim();
  const low = rows.filter((r) => comp(r) === "낮음");
  const mid = rows.filter((r) => comp(r) === "중간");
  const high = rows.filter((r) => comp(r) === "높음");

  // ── 지역 글감(먼저 — 일반 후보 개수 계산에 필요) ──
  // 지역형 사업장이면 동네+업종 글감을 앞에. 본인이 쓴 건 제외.
  const level = regionLevel(vertical, sub ?? null);
  const type = bloggerType(vertical); // local/online/hobby → 카피 톤
  let regions = extractRegions(profile?.biz_address as string | null, level);
  // 생활권 별칭 AI 보완 — 주소 파싱이 못 잡는 봉산리→오송 등. 지역형(non-wide)일 때만.
  if (level !== "wide" && profile?.biz_address && !cluster) {
    const aud = audActive ? audSel.filter((a) => a !== AUDIENCE_ALL).join("·") : undefined;
    const aiAreas = await expandLocalAreas(String(profile.biz_address), sub || vertical, aud, level === "dong");
    if (aiAreas.length) regions = [...new Set([...aiAreas, ...regions])];
  }
  const local = isLocalBusiness(level, regions) && !cluster;
  // 지역 글감은 '지역 강화' 모드(opt-in)에서만 — 평소엔 안 띄움(데이터 백킹 + 버튼).
  const regionMode = new URL(req.url).searchParams.get("region") === "1" && local;

  // 하루 고정 시드(userId+날짜): 그날은 새로고침해도 같은 추천.
  const rng = mulberry32(seedFrom(`${user.id}-${new Date().toISOString().slice(0, 10)}`));
  const want = PICK + 8; // ok·적합도 필터 후에도 PICK개 채우게 넉넉히
  let candidates: PoolRow[] = [];

  if (regionMode) {
    // ── 지역 강화: 지역 키워드 '실데이터'(네이버 검색량/경쟁) 수집 — '오송 영어학원' 등 ──
    const seeds = buildLocalSeeds(regions, vertical, sub ?? null).slice(0, 3);
    const collected = new Map<string, PoolRow>();
    for (const seed of seeds) {
      try {
        const kws = await collectPoolKeywords(seed);
        for (const k of kws) {
          if (collected.has(k.keyword) || usedSet.has(normalizeKeyword(k.keyword)) || isUnsafeKeyword(k.keyword)) continue;
          collected.set(k.keyword, { keyword: k.keyword, monthly_searches: Number(k.monthlyMobileQcCnt) || 0, competition: k.compIdx ?? null, audience: null, blog_total: null });
        }
      } catch { /* 수집 실패 시드는 건너뜀 */ }
    }
    const hasRegion = (kw: string) => regions.some((r) => kw.includes(r));
    candidates = [...collected.values()]
      .sort((a, b) => (hasRegion(b.keyword) ? 1 : 0) - (hasRegion(a.keyword) ? 1 : 0) || (b.monthly_searches ?? 0) - (a.monthly_searches ?? 0))
      .slice(0, want);
  } else {
    // ── 일반 후보(풀 기반) ── 노이즈·중복 제외로 빠질 것 대비해 여유분(want)까지.
    const general = pickBalanced(mid, audActive ? audSel : [], want + 1, rng);
    if (low.length > 0 && rng() < 0.28) candidates.push(low[Math.floor(rng() * low.length)]); // 싹 1개 가끔
    const add = (arr: PoolRow[]) => {
      for (const r of arr) {
        if (candidates.length >= want) break;
        if (!candidates.some((x) => x.keyword === r.keyword)) candidates.push(r);
      }
    };
    add(general); add(low); add(high);
  }

  // ── 제목·카테고리·노이즈판별(여유분 한 번에) ──
  const allKeywords = candidates.map((r) => r.keyword);
  if (allKeywords.length === 0) return NextResponse.json({ topics: [] });
  // 통합 맥락(분야·대상·사용자 지역) → AI가 브랜드·타지역·대상불일치·무관 키워드까지 한 번에 거름
  const ctxParts = [`분야: ${sub || vertical}`];
  if (audActive) ctxParts.push(`대상: ${audSel.filter((a) => a !== AUDIENCE_ALL).join("·")}`);
  if (local && regions.length) ctxParts.push(`사용자 지역: ${regions.join("·")}`);
  const titled = await keywordsToTitles(allKeywords, ctxParts.join(" / ")); // {title, tag, ok, fit}

  // 화면에 뜰 글감 행(노이즈 제외 + 업종 핵심 적합도 높은 순 + PICK개). 동점은 순서 유지(변동성).
  const generalRows = candidates
    .map((r, i) => ({ r, t: titled[i] }))
    .filter(({ t }) => t?.ok !== false)
    .sort((a, b) => (b.t?.fit ?? 1) - (a.t?.fit ?? 1))
    .slice(0, PICK);

  // ── 진짜 콘텐츠 경쟁(blog_total) 채우기 ──
  // 화면에 뜰 것만, 미수집(null)이면 네이버 블로그검색 1회 → 풀에 캐싱(전 유저 공용 → 유저수 무관).
  await Promise.all(
    generalRows.map(async ({ r }) => {
      if (r.blog_total != null) return;
      const total = await fetchBlogTotal(r.keyword);
      if (total == null) return;
      r.blog_total = total;
      try { await pool.from("keyword_pool").update({ blog_total: total }).eq("keyword", r.keyword); } catch { /* 캐싱 실패해도 진행 */ }
    }),
  );

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
      tag: t?.tag ?? "",
    };
  });
  // 우리동네(지역) 카드를 항상 맨 위 고정하지 않고 섞는다 — 하루 시드로 위치는 그날 내내 안정적.
  return NextResponse.json({ topics: shuffle(topics, rng) });
}
