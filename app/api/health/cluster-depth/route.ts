import { NextResponse } from "next/server";
import { createSupabaseAdminClient, createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";

// ★'한 우물 vs 흩뿌리기' 근거표(2026-08-04)
//  배경: 우리 보드는 소주제를 일부러 흩뿌린다(클러스터 라운드로빈 — 비슷한 글감 몰림 방지).
//  그런데 "네이버 AI는 한 주제를 깊게 판 블로그를 전문가로 인식해 추천 피드에 더 태운다"는 통설이 있다.
//  ★통설은 통설이다 — 우리에겐 반증할 재료가 있다(rank_snapshots D+7).
//   같은 클러스터를 여러 편 쓴 주제와 한 편만 쓴 주제의 순위 성적을 나란히 놓고 본다.
//   깊이가 성적을 끌어올린다면 라운드로빈을 완화할 근거가 되고, 아니면 지금 설계가 맞다는 근거가 된다.
//  ★수치가 부족하면 '부족하다'고 답한다 — 표본 미달을 결론으로 포장하지 않는다.
export const maxDuration = 60;
const MIN_SAMPLE = 3; // 이보다 적은 클러스터는 판단 대상에서 뺀다(한 편짜리 우연)

async function authorized(request: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret && (request.headers.get("authorization") === `Bearer ${secret}` || request.headers.get("x-cron-secret") === secret)) return true;
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

  const { data: arts, error } = await db.from("articles")
    .select("id, keyword, title, created_at, selection_meta, status")
    .in("status", ["verified", "published", "copied", "draft"])
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) return NextResponse.json({ error: error.message.slice(0, 200) }, { status: 500 });

  // 클러스터 = 선별 당시 기록해 둔 값(selection_meta.cluster). 없는 글은 '미기록'으로 따로 센다 —
  // 0으로 뭉개면 '기록이 없다'와 '클러스터가 없다'가 구분되지 않는다.
  const byCluster = new Map<string, { count: number; ids: string[]; keywords: string[] }>();
  let unrecorded = 0;
  for (const a of arts ?? []) {
    const c = (a.selection_meta as { cluster?: string } | null)?.cluster;
    if (!c) { unrecorded += 1; continue; }
    const cur = byCluster.get(c) ?? { count: 0, ids: [], keywords: [] };
    cur.count += 1;
    cur.ids.push(a.id);
    if (cur.keywords.length < 4) cur.keywords.push(String(a.keyword ?? ""));
    byCluster.set(c, cur);
  }

  // D+7 순위 — 있으면 붙이고, 없으면 없다고 말한다
  const allIds = [...byCluster.values()].flatMap((v) => v.ids).slice(0, 400);
  const rankByArticle = new Map<string, number>();
  let rankNote: string | null = null;
  if (allIds.length) {
    const { data: snaps, error: se } = await db.from("rank_snapshots")
      .select("article_id, rank, status, day_offset, area")
      .eq("day_offset", 7).eq("area", "blog_tab").in("article_id", allIds);
    if (se) rankNote = `순위 조회 실패: ${se.message.slice(0, 120)}`;
    else {
      for (const s of snaps ?? []) {
        const r = Number((s as { rank?: number }).rank);
        if (Number.isFinite(r) && r > 0) rankByArticle.set(String(s.article_id), r);
      }
      if (!snaps?.length) rankNote = "D+7 순위 스냅샷이 아직 없다 — 깊이 효과는 아직 판단할 수 없다";
    }
  }

  const rows = [...byCluster.entries()].map(([cluster, v]) => {
    const ranks = v.ids.map((id) => rankByArticle.get(id)).filter((x): x is number => typeof x === "number");
    return {
      cluster,
      편수: v.count,
      예시: v.keywords,
      순위측정: ranks.length,
      평균순위: ranks.length ? Math.round((ranks.reduce((a, b) => a + b, 0) / ranks.length) * 10) / 10 : null,
      최고순위: ranks.length ? Math.min(...ranks) : null,
    };
  }).sort((a, b) => b.편수 - a.편수);

  // 깊이별 비교 — 여러 편 쓴 클러스터 vs 한 편짜리
  const deep = rows.filter((r) => r.편수 >= MIN_SAMPLE && r.평균순위 != null);
  const shallow = rows.filter((r) => r.편수 === 1 && r.평균순위 != null);
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
  const 결론 = deep.length >= 2 && shallow.length >= 2
    ? `깊게 판 클러스터(${MIN_SAMPLE}편+) 평균순위 ${avg(deep.map((r) => r.평균순위!))} vs 한 편짜리 ${avg(shallow.map((r) => r.평균순위!))} — 숫자가 작을수록 좋다`
    : `표본 부족(깊은 클러스터 ${deep.length}개 · 한 편짜리 ${shallow.length}개, 각각 2개 이상 필요) — 아직 판단하지 않는다`;

  return NextResponse.json({
    ok: true,
    글수: (arts ?? []).length,
    클러스터수: byCluster.size,
    "미기록(선별 맥락 없음)": unrecorded,
    순위메모: rankNote,
    결론,
    상위클러스터: rows.slice(0, 15),
    참고: "cluster는 선별 시점에 기록된다(selection_meta.cluster). 그 전에 쓴 글은 '미기록'으로 빠지므로, 이 표는 앞으로 쌓이는 글부터 의미가 커진다.",
  });
}
