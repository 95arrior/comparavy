import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { keywordsToTitles } from "@/lib/topicTitles";
import { normalizeKeyword } from "@/lib/diversity";
import { audienceOf, AUDIENCE_ALL } from "@/lib/audience";
import { isUnsafeKeyword } from "@/lib/keywordSafety";
import { regionLevel, extractRegions, isLocalBusiness, buildLocalSeeds } from "@/lib/region";
import { bloggerType, type BloggerType } from "@/lib/bloggerTypes";
import { compFromLabel, type Comp } from "@/lib/topicScore";
import { buildPoolForSub } from "@/lib/keywordPool";
import { checkRateLimit } from "@/lib/rateLimit";

// 사장의 blog_profile(vertical + sub_category)로 keyword_pool에서 글감 3개를 뽑는다.
// Stage 2-B 분산: ① least-used 우선(times_assigned asc) ② 본인이 이미 쓴 키워드 제외 ③ 그 안 랜덤.
export const dynamic = "force-dynamic";
export const maxDuration = 60; // 신규 카테고리 첫 요청은 lazy-fill(네이버 수집)이 요청 안에서 돌아 시간 필요

const PICK = 3;
const WINDOW = 150; // least-used 윈도우 크기 — 이 안에서 랜덤(반복 많으면 키우고, 마이너 자주 뜨면 줄임)

interface PoolRow { keyword: string; monthly_searches: number | null; competition: string | null; audience: string | null }

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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 고른 대상(specific)별로 골고루 번갈아 n개 뽑는다. 대상 마커 없는 '중립' 키워드는 모자랄 때 채움.
// 대상이 0~1개면(또는 비활성) 그냥 랜덤.
function pickBalanced(rows: PoolRow[], auds: string[], n: number): PoolRow[] {
  const specific = auds.filter((a) => a !== AUDIENCE_ALL);
  if (specific.length <= 1) return shuffle(rows).slice(0, n);
  const buckets = new Map<string, PoolRow[]>(specific.map((a) => [a, []]));
  const neutral: PoolRow[] = [];
  for (const r of shuffle(rows)) {
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

export async function GET() {
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

  // keyword_pool은 공용 풀(RLS 정책 없음 = 서버 전용). 서비스롤로 읽는다(category_insights와 동일 패턴).
  // 유저별 비밀이 아닌 공용 데이터이고, 조회 조건은 위에서 본인 확인된 프로필 값(vertical/sub)뿐이라 안전.
  const pool = createSupabaseAdminClient();

  // least-used 우선 윈도우(times_assigned asc → 균등 분산). 본인이 쓴 건 제외 후 남은 것만.
  // 적정범위 = 월 500~5,000 (경쟁 과열·초저검색 회피). sub 없거나 부족하면 단계적으로 넓힌다.
  async function fetchPool(useSub: boolean, ranged: boolean): Promise<PoolRow[]> {
    let q = pool.from("keyword_pool").select("keyword, monthly_searches, competition, audience").eq("vertical", vertical);
    if (useSub && sub) q = q.eq("sub", sub);
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
  // 풀이 비면(커스텀·신규 세부업종) 그 sub를 시드로 '실데이터' 한 번 수집→저장→재조회.
  // 이후 같은 업종은 풀에서 바로(무료·즉시). 남용 방지 레이트리밋.
  if (rows.length === 0 && sub) {
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
  // 낮음 = 싹 키워드(전설·희귀: 가끔 랜덤 1개), 중간 = 일반(선점 가능·기본), 높음 = 빅키워드(최악·마지막 수단)
  const comp = (r: PoolRow) => (r.competition ?? "").trim();
  const low = rows.filter((r) => comp(r) === "낮음");
  const mid = rows.filter((r) => comp(r) === "중간");
  const high = rows.filter((r) => comp(r) === "높음");

  // 일반 슬롯은 '중간' 위주(대상 균형 적용). 높음은 끝까지 안 차면만.
  const general = pickBalanced(mid, audActive ? audSel : [], PICK + 1);

  const result: PoolRow[] = [];
  // ★전설 포켓몬: 매번 X — 이번 추천에 ~28% 확률로 싹(낮음) 1개만 무작위 등장.
  if (low.length > 0 && Math.random() < 0.28) {
    result.push(low[Math.floor(Math.random() * low.length)]);
  }
  const add = (arr: PoolRow[]) => {
    for (const r of arr) {
      if (result.length >= PICK) break;
      if (!result.some((x) => x.keyword === r.keyword)) result.push(r);
    }
  };
  add(general); // 일반(중간)
  add(low);     // 중간 부족하면 싹으로 채움(싹이 차선)
  add(high);    // 그래도 모자라면 빅키워드(마지막 수단)

  // ── 지역 글감 ──
  // 지역형 사업장이면(주소 있음 + 전국형 아님) 사업장 동네 + 업종 글감을 앞에 섞는다.
  // 지역 키워드 = 경쟁 낮고 전환 높은 '동네 손님' 검색 → 본인이 이미 쓴 건 제외.
  const level = regionLevel(vertical, sub ?? null); // 업종별 지역 범위(동/구/광역)
  const type = bloggerType(vertical); // local/online/hobby → 카피 톤
  const regions = extractRegions(profile?.biz_address as string | null, level);
  const local = isLocalBusiness(level, regions);
  const localSeeds = local
    ? buildLocalSeeds(regions, vertical, sub ?? null).filter(
        (k) => !usedSet.has(normalizeKeyword(k)) && !isUnsafeKeyword(k),
      )
    : [];

  // 지역 글감은 앞에, 나머지는 일반 글감으로 PICK까지 채움
  const pickedRows = result.slice(0, Math.max(0, PICK - localSeeds.length));
  const allKeywords = [...localSeeds, ...pickedRows.map((r) => r.keyword)];
  if (allKeywords.length === 0) return NextResponse.json({ topics: [] });
  const titles = await keywordsToTitles(allKeywords);

  const topics = [
    ...localSeeds.map((k, i) => ({
      keyword: k,
      title: titles[i],
      demandLabel: "우리 동네 손님이 찾는 검색",
      ssak: false,
      region: true,
      tone: "local" as BloggerType,
      vol: 0, // 지역 글감은 검색량 데이터 없음(카드 지표 대신 '우리 동네' 표시)
      comp: "mid" as Comp,
    })),
    ...pickedRows.map((r, i) => ({
      keyword: r.keyword,
      title: titles[localSeeds.length + i],
      demandLabel: demandLabel(r.monthly_searches, type),
      ssak: comp(r) === "낮음", // 싹 키워드(전설)
      region: false,
      tone: type,
      vol: r.monthly_searches ?? 0, // 한 달 검색 N회(실데이터)
      comp: compFromLabel(r.competition), // 선점 별점·감정용
    })),
  ].slice(0, PICK);
  return NextResponse.json({ topics });
}
