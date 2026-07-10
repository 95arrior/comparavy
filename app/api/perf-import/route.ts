import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { FF } from "@/config/featureFlags";

// ★성과 임포트(FF_PERF_LOOP §1-3) — 크리에이터 어드바이저 유입 키워드·애드포스트 일별 수익 붙여넣기.
//  공식 API 부재(조사 완료: 둘 다 로그인 웹 전용) → 관대한 붙여넣기 파서. 한 번에 한 종류만(한 화면 하나).
export const maxDuration = 60;

function parseInflow(text: string): { keyword: string; inflow: number }[] {
  const out: { keyword: string; inflow: number }[] = [];
  for (const raw of text.split("\n").slice(0, 500)) {
    const line = raw.trim();
    if (!line) continue;
    // 형태 허용: "키워드<탭|공백>123" / "1. 키워드 123회" — 마지막 숫자 = 유입수, 나머지 = 키워드
    const m = /^(?:\d+[.)]\s*)?(.+?)[\s\t]+([\d,]+)\s*(?:회|명)?$/.exec(line);
    if (!m) continue;
    const kw = m[1]!.trim().slice(0, 60);
    const n = Number(m[2]!.replace(/,/g, ""));
    if (kw && Number.isFinite(n) && n >= 0) out.push({ keyword: kw, inflow: n });
  }
  return out;
}

function parseRevenue(text: string): { date: string; revenue: number }[] {
  const out: { date: string; revenue: number }[] = [];
  for (const raw of text.split("\n").slice(0, 500)) {
    const line = raw.trim();
    if (!line) continue;
    // 형태 허용: "2026-07-10 1,234" / "2026.07.10 1234원" / "7월 10일 1,234원"(연도=올해)
    const iso = /(\d{4})[.\-/]\s?(\d{1,2})[.\-/]\s?(\d{1,2})/.exec(line);
    const kor = /(\d{1,2})월\s?(\d{1,2})일/.exec(line);
    const amt = /([\d,]+)\s*원?\s*$/.exec(line);
    if (!amt) continue;
    let date: string | null = null;
    if (iso) date = `${iso[1]}-${String(Number(iso[2])).padStart(2, "0")}-${String(Number(iso[3])).padStart(2, "0")}`;
    else if (kor) date = `${new Date(Date.now() + 9 * 3600_000).getUTCFullYear()}-${String(Number(kor[1])).padStart(2, "0")}-${String(Number(kor[2])).padStart(2, "0")}`;
    if (!date) continue;
    const n = Number(amt[1]!.replace(/,/g, ""));
    if (Number.isFinite(n) && n >= 0) out.push({ date, revenue: n });
  }
  return out;
}

export async function POST(request: Request) {
  if (!FF.perfLoop) return NextResponse.json({ error: "준비 중인 기능이에요." }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { kind?: string; text?: string; date?: string };
  const text = String(body.text ?? "").slice(0, 100_000);
  if (!text.trim()) return NextResponse.json({ error: "붙여넣은 내용이 비어 있어요." }, { status: 400 });

  const { data: profile } = await supabase.from("blog_profiles").select("id, vertical, sub_category").eq("user_id", user.id).eq("is_active", true).maybeSingle();
  const blogId = profile?.id ?? null;
  const admin = createSupabaseAdminClient();

  if (body.kind === "revenue") {
    const rows = parseRevenue(text);
    if (rows.length === 0) return NextResponse.json({ error: "날짜와 금액을 찾지 못했어요. 애드포스트 일별 수익 표를 그대로 붙여넣어 주세요." }, { status: 400 });
    for (const r of rows) {
      await admin.from("revenue_daily").upsert({ user_id: user.id, blog_id: blogId, date: r.date, revenue_krw: r.revenue }, { onConflict: "user_id,date" });
    }
    return NextResponse.json({ ok: true, imported: rows.length, kind: "revenue" });
  }

  // 기본 = 유입 키워드
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date)) ? String(body.date) : new Date(Date.now() + 9 * 3600_000 - 86400_000).toISOString().slice(0, 10); // 기본 어제(KST)
  const rows = parseInflow(text);
  if (rows.length === 0) return NextResponse.json({ error: "키워드와 유입수를 찾지 못했어요. 크리에이터 어드바이저의 유입 키워드 표를 그대로 붙여넣어 주세요." }, { status: 400 });
  // keyword_pool 미등재 = 실측 유입 검증 후보(자동 편입 금지 — 후보 큐까지만, 스펙 §1-3)
  const kws = rows.map((r) => r.keyword);
  const { data: pooled } = await admin.from("keyword_pool").select("keyword").eq("vertical", profile?.vertical ?? "").in("keyword", kws.slice(0, 200));
  const inPool = new Set((pooled ?? []).map((p) => String(p.keyword)));
  let candidates = 0;
  for (const r of rows) {
    const cand = !inPool.has(r.keyword);
    if (cand) candidates += 1;
    await admin.from("inflow_keywords").upsert(
      { user_id: user.id, blog_id: blogId, date, keyword: r.keyword, inflow: r.inflow, pool_candidate: cand },
      { onConflict: "user_id,date,keyword" },
    );
  }
  return NextResponse.json({ ok: true, imported: rows.length, poolCandidates: candidates, kind: "inflow", date });
}
