// ★사건 밀도 분포 요약(2026-08-07) — "6시간 N건이면 진짜 사건"의 N을 실측으로 정하는 화면.
//  컷 후보는 코드가 제안하되 확정은 유저가 한다(감으로 정하지 않기로 한 바로 그 값이라,
//  여기서 단정하면 계측을 만든 의미가 없다). 읽기 전용.
import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const pct = (sorted: number[], p: number) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0 : 0;

export async function GET(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const days = Math.min(30, Math.max(1, Number(new URL(request.url).searchParams.get("days") ?? 7)));
  const admin = createSupabaseAdminClient();
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const { data } = await admin.from("event_density")
    .select("probe, grp, cnt_6h, outlets_6h, uniq_6h, measured_at, top_titles")
    .gte("measured_at", since).order("measured_at", { ascending: false }).limit(5000);
  const rows = data ?? [];
  if (!rows.length) {
    return NextResponse.json({ 안내: "아직 기록이 없다 — 크론(3시간마다)이 돌기 시작하면 쌓인다. 컷 판정은 3일치 이상 모인 뒤가 안전하다.", 기간: `${days}일` });
  }

  // probe별 분포 — 컷은 '평소'와 '사건'이 갈라지는 지점이다
  const byProbe = new Map<string, { grp: string; uniq: number[]; outlets: number[] }>();
  for (const r of rows) {
    const b = byProbe.get(String(r.probe)) ?? { grp: String(r.grp), uniq: [], outlets: [] };
    b.uniq.push(Number(r.uniq_6h)); b.outlets.push(Number(r.outlets_6h));
    byProbe.set(String(r.probe), b);
  }
  const 분포 = [...byProbe.entries()].map(([probe, b]) => {
    const u = [...b.uniq].sort((x, y) => x - y);
    return {
      probe, 그룹: b.grp, 표본: u.length,
      "6h 실기사(중복제거)": { 중앙값: pct(u, 0.5), 상위10퍼: pct(u, 0.9), 최대: u[u.length - 1] ?? 0 },
      "매체수 중앙값": pct([...b.outlets].sort((x, y) => x - y), 0.5),
    };
  }).sort((a, b) => b["6h 실기사(중복제거)"].중앙값 - a["6h 실기사(중복제거)"].중앙값);

  // ★가장 최근 측정에서 '지금 뜨거운 것' — 컷을 정하기 전에도 눈으로 보는 용도
  const latest = new Map<string, { uniq: number; titles: unknown }>();
  for (const r of rows) if (!latest.has(String(r.probe))) latest.set(String(r.probe), { uniq: Number(r.uniq_6h), titles: r.top_titles });
  const 지금 = [...latest.entries()].map(([probe, v]) => ({ probe, "6h 실기사": v.uniq, 대표제목: v.titles }))
    .sort((a, b) => b["6h 실기사"] - a["6h 실기사"]).slice(0, 6);

  const 표본충분 = rows.length >= EVENTS_MIN_SAMPLE;
  return NextResponse.json({
    기간: `${days}일`, 기록: rows.length,
    판정가능: 표본충분 ? "예" : `아직 — 기록 ${rows.length}건(${EVENTS_MIN_SAMPLE}건 이상 권장, 3일치)`,
    해석: "컷 후보 = 평소(중앙값)와 확실히 갈라지는 상위10퍼 부근. 대표 제목을 같이 봐야 한다 — '이 숫자일 때 이런 사건'이 납득돼야 컷이다.",
    분포, 지금,
  });
}

// 17개 probe × 하루 8회 × 3일 ≈ 400
const EVENTS_MIN_SAMPLE = 400;
