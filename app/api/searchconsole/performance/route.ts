import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { gscGetValidToken, gscSearchAnalytics } from "@/lib/searchConsole";

// 5-2: 선택한 사이트의 검색 성과(노출/클릭/CTR/평균순위) + 일별·주별 추이를 JSON으로 반환.
// 화면 그래프는 5-3. 게이트는 기존과 동일(로그인 + PRELAUNCH 중 관리자만).

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ISO 주의 시작(월요일) 날짜 문자열
function isoWeekStart(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const mondayOffset = (d.getUTCDay() + 6) % 7; // 월=0 ... 일=6
  d.setUTCDate(d.getUTCDate() - mondayOffset);
  return d.toISOString().slice(0, 10);
}

type Point = { date: string; clicks: number; impressions: number; ctr: number; position: number };

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (process.env.PRELAUNCH === "true" && !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "아직 오픈 전이에요." }, { status: 403 });
  }

  // 선택된 사이트
  const { data: conn } = await supabase
    .from("searchconsole_connections")
    .select("selected_site")
    .eq("user_id", user.id)
    .maybeSingle();
  const site = conn?.selected_site;
  if (!site) return NextResponse.json({ error: "먼저 서치콘솔 사이트를 선택해 주세요." }, { status: 400 });

  // 유효 토큰(만료 시 자동 refresh)
  const token = await gscGetValidToken(user.id);
  if (!token) return NextResponse.json({ error: "구글 서치콘솔 연결이 필요해요." }, { status: 400 });

  // 파라미터: days(1~365, 기본 28), granularity(date|week, 기본 date)
  const url = new URL(req.url);
  const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get("days") || "28", 10) || 28));
  const granularity = url.searchParams.get("granularity") === "week" ? "week" : "date";

  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const startDate = ymd(start);
  const endDate = ymd(end);
  // 참고: 서치콘솔 데이터는 보통 2~3일 지연 → 최근 며칠은 비어 보일 수 있음(정상).

  // (a) 합계 — dimensions 없이 단일 집계 행(평균순위가 정확)
  const totalsRes = await gscSearchAnalytics(token, site, { startDate, endDate, dimensions: [] });
  if (totalsRes.error) return NextResponse.json({ error: totalsRes.error }, { status: 502 });
  const t = totalsRes.rows[0];
  const totals = t
    ? { clicks: t.clicks, impressions: t.impressions, ctr: t.ctr, position: t.position }
    : { clicks: 0, impressions: 0, ctr: 0, position: 0 };

  // (b) 추이 — 일자별
  const seriesRes = await gscSearchAnalytics(token, site, { startDate, endDate, dimensions: ["date"], rowLimit: 1000 });
  if (seriesRes.error) return NextResponse.json({ error: seriesRes.error }, { status: 502 });
  const daily: Point[] = seriesRes.rows
    .map((r) => ({ date: r.keys?.[0] ?? "", clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }))
    .filter((r) => r.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  let series: Point[] = daily;
  if (granularity === "week") {
    // 일자별 → 주(월요일 시작)로 묶기. 클릭·노출 합산, CTR 재계산, 평균순위는 노출 가중평균(근사).
    const buckets = new Map<string, { clicks: number; impressions: number; posWeighted: number }>();
    for (const r of daily) {
      const wk = isoWeekStart(r.date);
      const b = buckets.get(wk) ?? { clicks: 0, impressions: 0, posWeighted: 0 };
      b.clicks += r.clicks;
      b.impressions += r.impressions;
      b.posWeighted += r.position * r.impressions;
      buckets.set(wk, b);
    }
    series = [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([wk, b]) => ({
        date: wk, // 주 시작(월) 날짜
        clicks: b.clicks,
        impressions: b.impressions,
        ctr: b.impressions ? b.clicks / b.impressions : 0,
        position: b.impressions ? b.posWeighted / b.impressions : 0,
      }));
  }

  return NextResponse.json({ site, range: { startDate, endDate }, granularity, totals, series });
}
