// ★글감 수명·천장 측정(2026-07-29 유저 지시: "로그만 먼저 찍어서 몇 % 걸리는지 측정").
//  차단은 하지 않는다 — 새 규칙을 지금 적용하면 글감 풀이 얼마나 얇아지는지 모르고 발행이 멈출 수 있다.
//  두 모집단을 각각 재서 '조이면 무엇이 사라지는지'를 숫자로 보여준다:
//   ①내가 이미 쓴 글(성과와 대조 가능) ②현재 글감 풀(앞으로 배정될 후보)
//  ?min=100 처럼 임계를 바꿔가며 호출해 분포를 보고 임계를 정한다.
import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { scanLifespan, quantiles } from "@/lib/topicLifespan";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function tally(rows: { keyword: string; title: string; searches: number | null }[], min: number) {
  const counts: Record<string, number> = {};
  const samples: Record<string, string[]> = {};
  let flagged = 0;
  for (const r of rows) {
    const { reasons } = scanLifespan(r.keyword, r.title, r.searches, min);
    if (reasons.length === 0) continue;
    flagged++;
    for (const why of reasons) {
      counts[why] = (counts[why] ?? 0) + 1;
      (samples[why] ??= []).length < 5 && samples[why]!.push(r.keyword);
    }
  }
  return {
    전체: rows.length,
    걸림: flagged,
    비율: rows.length ? `${Math.round((flagged / rows.length) * 1000) / 10}%` : "-",
    사유별: counts,
    예시: samples,
  };
}

export async function GET(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const min = Math.max(0, parseInt(new URL(request.url).searchParams.get("min") || "0", 10) || 0);
  const db = createSupabaseAdminClient();

  // ① 내가 쓴 글 — 실제 성과와 대조할 수 있는 모집단
  const { data: arts } = await supabase
    .from("articles").select("keyword, title, created_at").eq("user_id", user.id)
    .order("created_at", { ascending: false }).limit(300);
  const mine = (arts ?? []).map((a) => ({ keyword: String(a.keyword ?? ""), title: String(a.title ?? ""), searches: null }));

  // ② 현재 글감 풀 — 앞으로 배정될 후보(조이면 여기서 얼마가 빠지는지가 핵심)
  const { data: prof } = await supabase.from("blog_profiles").select("vertical, sub_category, topic").eq("user_id", user.id).eq("is_active", true).maybeSingle();
  const sub = String(prof?.sub_category ?? prof?.topic ?? "");
  let poolQ = db.from("keyword_pool").select("keyword, monthly_searches, times_assigned").limit(3000);
  if (prof?.vertical) poolQ = poolQ.eq("vertical", prof.vertical);
  if (sub) poolQ = poolQ.eq("sub", sub);
  const { data: poolRows } = await poolQ;
  const pool = (poolRows ?? []).map((p) => ({ keyword: String(p.keyword ?? ""), title: "", searches: typeof p.monthly_searches === "number" ? p.monthly_searches : null }));

  // 검색량 분포 — 임계를 정하려면 평균이 아니라 분위수를 봐야 한다
  const dist = quantiles(pool.map((p) => p.searches).filter((x): x is number => x !== null));
  // 임계 후보별로 '풀이 얼마나 줄어드는지' 미리 계산(한 번에 판단할 수 있게)
  const ceilingCuts: Record<string, string> = {};
  if (dist) {
    for (const t of [50, 100, 200, 500, 1000]) {
      const under = pool.filter((p) => p.searches !== null && p.searches < t).length;
      ceilingCuts[`${t}회_미만`] = `${under}개 (${pool.length ? Math.round((under / pool.length) * 1000) / 10 : 0}%)`;
    }
  }

  return NextResponse.json({
    안내: "측정 전용 — 지금은 아무것도 차단하지 않습니다. ?min=100 처럼 임계를 바꿔 호출하세요.",
    임계_적용값: min || "미적용(검색량 판정 생략)",
    "①내가_쓴_글": tally(mine, 0), // 글엔 검색량이 없어 지역·시효만 판정
    "②현재_글감_풀": tally(pool, min),
    "글감_풀_검색량_분포": dist ?? "검색량 데이터 없음",
    "천장_임계별_제외량": ceilingCuts,
  });
}
