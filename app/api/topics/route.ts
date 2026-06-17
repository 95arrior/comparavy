import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { keywordsToTitles } from "@/lib/topicTitles";
import { normalizeKeyword } from "@/lib/diversity";

// 사장의 blog_profile(vertical + sub_category)로 keyword_pool에서 글감 3개를 뽑는다.
// Stage 2-B 분산: ① least-used 우선(times_assigned asc) ② 본인이 이미 쓴 키워드 제외 ③ 그 안 랜덤.
export const dynamic = "force-dynamic";

const PICK = 3;
const WINDOW = 150; // least-used 윈도우 크기 — 이 안에서 랜덤(반복 많으면 키우고, 마이너 자주 뜨면 줄임)

interface PoolRow { keyword: string; monthly_searches: number | null; competition: string | null }

// 검색량 → 사장이 이해하는 쉬운 말(숫자 노출 X). 숫자 의미 모르는 초보용.
function demandLabel(searches: number | null): string {
  const n = searches ?? 0;
  if (n >= 3000) return "🔥 많이 검색돼요";
  if (n >= 800) return "꾸준히 찾는 주제";
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

export async function GET() {
  // 인증·프로필은 유저 클라이언트(RLS) — 본인 확인 + 본인 프로필만 읽음.
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const { data: profile } = await supabase
    .from("blog_profiles")
    .select("vertical, sub_category")
    .eq("user_id", user.id)
    .maybeSingle();

  const vertical = profile?.vertical;
  const sub = profile?.sub_category;
  if (!vertical) return NextResponse.json({ topics: [] }); // 온보딩 전

  // 본인이 이미 쓴 키워드(정규화 집합) — 제외용. articles는 owner RLS라 유저 클라로 본인 것만.
  const { data: mine } = await supabase.from("articles").select("keyword").eq("user_id", user.id);
  const usedSet = new Set((mine ?? []).map((a) => normalizeKeyword(String(a.keyword ?? ""))).filter(Boolean));

  // keyword_pool은 공용 풀(RLS 정책 없음 = 서버 전용). 서비스롤로 읽는다(category_insights와 동일 패턴).
  // 유저별 비밀이 아닌 공용 데이터이고, 조회 조건은 위에서 본인 확인된 프로필 값(vertical/sub)뿐이라 안전.
  const pool = createSupabaseAdminClient();

  // least-used 우선 윈도우(times_assigned asc → 균등 분산). 본인이 쓴 건 제외 후 남은 것만.
  // 적정범위 = 월 500~5,000 (경쟁 과열·초저검색 회피). sub 없거나 부족하면 단계적으로 넓힌다.
  async function fetchPool(useSub: boolean, ranged: boolean): Promise<PoolRow[]> {
    let q = pool.from("keyword_pool").select("keyword, monthly_searches, competition").eq("vertical", vertical);
    if (useSub && sub) q = q.eq("sub", sub);
    if (ranged) q = q.gte("monthly_searches", 500).lte("monthly_searches", 5000);
    const { data } = await q
      .order("times_assigned", { ascending: true }) // 덜 쓰인 것 먼저(기존 인덱스 활용)
      .order("monthly_searches", { ascending: false })
      .limit(WINDOW);
    const rows = (data ?? []) as PoolRow[];
    return rows.filter((r) => !usedSet.has(normalizeKeyword(r.keyword))); // 본인 작성분 제외
  }

  // 단계적 폴백: (sub+적정범위) → (sub+전체) → (vertical+적정범위) → (vertical+전체). 항상 3개 나오게.
  const steps: [boolean, boolean][] = sub
    ? [[true, true], [true, false], [false, true], [false, false]]
    : [[false, true], [false, false]];
  let rows: PoolRow[] = [];
  for (const [useSub, ranged] of steps) {
    rows = await fetchPool(useSub, ranged);
    if (rows.length >= PICK) break;
  }
  if (rows.length === 0) return NextResponse.json({ topics: [] });

  const picked = shuffle(rows).slice(0, PICK);
  const titles = await keywordsToTitles(picked.map((r) => r.keyword));

  const topics = picked.map((r, i) => ({
    keyword: r.keyword,
    title: titles[i],
    demandLabel: demandLabel(r.monthly_searches),
  }));
  return NextResponse.json({ topics });
}
