import { NextResponse } from "next/server";
import { createSupabaseAdminClient, createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { buildPoolForSub } from "@/lib/keywordPool";
import { CATEGORIES } from "@/lib/categories";
import { isAdminEmail } from "@/lib/adminStats";
import { logUsage } from "@/lib/usageLog";

// ★키워드 풀 사전 적재(워밍) — "온보딩 순간에야 수집"의 첫날 빈약함 제거(실측: 새 자동차 블로그 풀 0 → 파쇄기 사고).
//  표준 카테고리(대분류 18 + 세부 ~70)를 '비었거나 오래된 순'으로 배치(15개/회) 재적재 — 하루 2회면 이틀 내 전체 순회 후 유지.
//  쿼터: sub당 검색광고 keywordstool 수 콜 — 15 sub/회 × 2회/일 ≈ 일 수십 콜(한도 대비 미미).
export const maxDuration = 300;
const BATCH = 15;
const STALE_DAYS = 7; // 이 이상 안 갱신된 sub는 재적재 대상

function allSubs(): string[] {
  const out: string[] = [];
  for (const c of CATEGORIES) { out.push(c.name); for (const s of c.subs) out.push(s); }
  return [...new Set(out)];
}

async function authorized(request: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret && (request.headers.get("authorization") === `Bearer ${secret}` || request.headers.get("x-cron-secret") === secret)) return true;
  // 관리자 세션도 허용 — 첫 워밍을 브라우저에서 킥할 수 있게
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return !!user && isAdminEmail(user.email);
  } catch { return false; }
}

export async function GET(request: Request) {
  if (!(await authorized(request))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const db = createSupabaseAdminClient();
  // ★오염 재빌드(관리자) — ?rebuild={sub}: 그 카테고리 창고를 비우고 관련성 게이트를 거쳐 재수집(실측: 자동차에 파쇄기)
  const rebuild = new URL(request.url).searchParams.get("rebuild");
  if (rebuild) {
    await db.from("keyword_pool").delete().eq("vertical", "online").eq("sub", rebuild);
    try {
      const r = await buildPoolForSub("online", rebuild, { sleepMs: 250 });
      return NextResponse.json({ ok: true, rebuilt: rebuild, inserted: r.inserted, dropped: r.dropped ?? 0 });
    } catch (e) {
      return NextResponse.json({ ok: false, rebuilt: rebuild, error: e instanceof Error ? e.message.slice(0, 100) : "?" }, { status: 500 });
    }
  }
  const subs = allSubs();

  // sub별 상태(개수·최신 갱신) → 빈 것 우선, 다음 오래된 것
  const { data: stats } = await db.from("keyword_pool").select("sub, updated_at").eq("vertical", "online").limit(20000);
  const bySub = new Map<string, { count: number; latest: number }>();
  for (const r of stats ?? []) {
    const cur = bySub.get(r.sub) ?? { count: 0, latest: 0 };
    cur.count += 1;
    const t = r.updated_at ? new Date(r.updated_at).getTime() : 0;
    if (t > cur.latest) cur.latest = t;
    bySub.set(r.sub, cur);
  }
  const staleMs = Date.now() - STALE_DAYS * 86400000;
  const targets = subs
    .map((s) => ({ s, st: bySub.get(s) ?? { count: 0, latest: 0 } }))
    .filter(({ st }) => st.count < 15 || st.latest < staleMs)
    .sort((a, b) => a.st.count - b.st.count || a.st.latest - b.st.latest)
    .slice(0, BATCH)
    .map(({ s }) => s);

  // ★자동 세탁 로테이션 — 매 실행마다 '가장 오래 안 갱신된' 데이터 보유 sub 1개는 delete 후 재수집(관련성 게이트).
  //  하루 2회 × 1개 → 약 6주에 전 카테고리 1바퀴 세탁. 신규 수집은 게이트라 새 오염 없음 — 수동 rebuild 불필요.
  const withData = subs.map((x) => ({ s: x, st: bySub.get(x) })).filter((x) => x.st && x.st.count > 0 && x.st.latest < staleMs).sort((a, b) => a.st!.latest - b.st!.latest);
  const washTarget = withData[0]?.s ?? null;
  if (washTarget) { try { await db.from("keyword_pool").delete().eq("vertical", "online").eq("sub", washTarget); } catch { /* 실패 시 다음 회차 */ } }
  const finalTargets = washTarget ? [washTarget, ...targets.filter((t) => t !== washTarget).slice(0, BATCH - 1)] : targets;

  const results: { sub: string; inserted: number; error?: string }[] = [];
  for (const sub of finalTargets) {
    try {
      const r = await buildPoolForSub("online", sub, { sleepMs: 250 });
      results.push({ sub, inserted: r.inserted });
    } catch (e) {
      results.push({ sub, inserted: 0, error: e instanceof Error ? e.message.slice(0, 80) : "?" });
    }
  }
  void logUsage({ model: "pool", kind: "pool_warm", inputTokens: targets.length, outputTokens: results.reduce((a, r) => a + r.inserted, 0) });
  return NextResponse.json({ ok: true, washed: washTarget, warmed: results, remainingCandidates: Math.max(0, subs.length - finalTargets.length) });
}
