// ★승부처 목록(2026-07-29 유저 요청 — "지금 밀면 넘어가는 글"을 앱이 매주 자동으로 뽑는다).
//  실측 배경: 3주차 pigtong의 전 키워드가 5.8~7.9위인데 클릭 0. 순위를 못 잡는 게 아니라 1페이지 아래쪽이라
//  클릭이 안 나는 것 → 새 글보다 '이미 걸친 글'을 3위로 올리는 편이 빠르다. 그 대상을 골라주는 API.
//  데이터원은 유저별 OAuth(searchconsole_connections) — 크론의 gsc_daily는 앱 단일 사이트라 다른 유저에겐 안 맞는다.
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { gscGetValidToken, gscSearchAnalytics } from "@/lib/searchConsole";
import { getCache, setCache, TTL_6H } from "@/lib/apiCache";
import { isPushable, pushGain, isZeroClickQuery, ctrAt } from "@/lib/serpCtr";
import { gscPageSlug } from "@/lib/gsc";

const ymd = (d: Date): string => d.toISOString().slice(0, 10);

interface QueryRow { query: string; impressions: number; clicks: number; position: number }
interface Opportunity {
  page: string; title: string | null; articleId: string | null;
  impressions: number; clicks: number; position: number; gain: number;
  queries: QueryRow[];
}

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (process.env.PRELAUNCH === "true" && !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "아직 오픈 전이에요." }, { status: 403 });
  }

  const { data: conn } = await supabase
    .from("searchconsole_connections").select("selected_site").eq("user_id", user.id).maybeSingle();
  const site = conn?.selected_site;
  if (!site) return NextResponse.json({ error: "먼저 서치콘솔을 연결해 주세요.", connect: true }, { status: 400 });

  const token = await gscGetValidToken(user.id);
  if (!token) return NextResponse.json({ error: "구글 서치콘솔 연결이 필요해요.", connect: true }, { status: 400 });

  const url = new URL(req.url);
  const days = Math.min(90, Math.max(7, parseInt(url.searchParams.get("days") || "28", 10) || 28));
  const cacheKey = `gscopp:${user.id}:${days}`;
  const cached = await getCache<unknown>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const startDate = ymd(start), endDate = ymd(end);

  // 검색어×페이지 — 페이지별로 묶어야 "어느 글을 밀지"가 나온다(검색어만 보면 같은 글이 흩어진다)
  const res = await gscSearchAnalytics(token, site, { startDate, endDate, dimensions: ["page", "query"], rowLimit: 5000 });
  if (res.error) return NextResponse.json({ error: res.error }, { status: 502 });

  // 슬러그 → 글 제목 매칭(베스트에포트 — gsc-sync 크론과 같은 규칙)
  const bySlug = new Map<string, { id: string; title: string | null }>();
  const { data: arts } = await supabase
    .from("articles").select("id, title, keyword").eq("user_id", user.id).not("wp_post_id", "is", null).limit(2000);
  for (const a of arts ?? []) {
    const k = String(a.keyword ?? "").replace(/\s+/g, "").toLowerCase();
    if (k) bySlug.set(k, { id: String(a.id), title: a.title ?? null });
  }

  const pages = new Map<string, Opportunity>();
  const zeroClick: QueryRow[] = [];
  for (const r of res.rows) {
    const page = r.keys?.[0] ?? "", query = r.keys?.[1] ?? "";
    if (!page || !query) continue;
    const row: QueryRow = { query, impressions: r.impressions, clicks: r.clicks, position: r.position };
    // 정의형은 순위와 무관하게 클릭이 안 남는다 — 승부처 집계에서 빼고 따로 보여준다(왜 빠졌는지 보이게)
    if (isZeroClickQuery(query)) { zeroClick.push(row); continue; }
    if (!isPushable(r.position)) continue; // 3위 안은 이미 이겼고, 10위 밖은 아직 밀 때가 아니다
    const cur = pages.get(page) ?? { page, title: null, articleId: null, impressions: 0, clicks: 0, position: 0, gain: 0, queries: [] };
    cur.impressions += r.impressions;
    cur.clicks += r.clicks;
    cur.gain += pushGain(r.impressions, r.position);
    cur.queries.push(row);
    pages.set(page, cur);
  }

  const opportunities: Opportunity[] = [...pages.values()]
    .filter((p) => p.impressions >= 5) // 노출 5회 미만은 아직 신호가 아니다(하루 한두 번 스쳐간 수준)
    .map((p) => {
      const art = bySlug.get(gscPageSlug(p.page));
      const posWeighted = p.queries.reduce((s, q) => s + q.position * q.impressions, 0);
      return {
        ...p,
        title: art?.title ?? null,
        articleId: art?.id ?? null,
        position: p.impressions ? posWeighted / p.impressions : 0, // 노출 가중 평균(단순 평균은 1노출 쿼리에 휘둘린다)
        queries: p.queries.sort((a, b) => b.impressions - a.impressions).slice(0, 5),
      };
    })
    .sort((a, b) => b.gain - a.gain) // 3위로 올렸을 때 늘어날 클릭이 큰 순 = 화력 배분 순서
    .slice(0, 12);

  const result = {
    site, range: { startDate, endDate }, days,
    opportunities,
    zeroClick: zeroClick.sort((a, b) => b.impressions - a.impressions).slice(0, 5),
    // 승부처 전부를 3위로 올렸을 때 기대되는 주간 클릭 — 화면에 '왜 이걸 해야 하는지'로 쓴다
    totalGain: opportunities.reduce((s, o) => s + o.gain, 0),
    ctrAt3: ctrAt(3),
  };
  await setCache(cacheKey, result, TTL_6H);
  return NextResponse.json(result);
}
