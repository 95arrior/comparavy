import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { checkIndexed } from "@/lib/naverBlogSearch";

export const maxDuration = 300;

// ★색인 스캔 크론 — 하루 1번, 발행 글이 네이버 검색에 잡혔는지 배치 확인해 DB에 저장.
//  이전엔 유저가 '내 글'을 열 때마다 검색 API를 호출 → 1만 명이면 쿼터(약 25k/일) 즉시 소진.
//  이제 화면은 저장값만 읽고, 실제 검색은 여기서만(쿼터 소비 90%↓).
//  우선순위: 미검사(null) → pending 20h 경과 → 그 외 7일 경과. 1회 최대 CAP개(쿼터 보호).
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  const xcron = request.headers.get("x-cron-secret");
  return auth === `Bearer ${secret}` || xcron === secret;
}

const CAP = 500; // 1회 검사 상한 — 네이버 쿼터 보호

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdminClient();

  const now = Date.now();
  const h20 = new Date(now - 20 * 3600_000).toISOString();
  const d7 = new Date(now - 7 * 24 * 3600_000).toISOString();

  // 대상: 발행 글 중 (미검사) 또는 (오래된 검사). 발행 최신 30일 위주로.
  const since30 = new Date(now - 30 * 24 * 3600_000).toISOString();
  const { data: rows } = await admin
    .from("articles")
    .select("id, user_id, title, indexed_status, indexed_at")
    .in("status", ["verified", "published"]) // ★verified가 주력(published는 레거시) — 색인 검사 누락 수리
    .gte("created_at", since30)
    .or(`indexed_at.is.null,indexed_at.lt.${d7},and(indexed_status.eq.pending,indexed_at.lt.${h20})`)
    .order("indexed_at", { ascending: true, nullsFirst: true })
    .limit(CAP);

  if (!rows?.length) return NextResponse.json({ ok: true, scanned: 0 });

  // 유저별 블로그 아이디 맵(링크 대조 정확도↑)
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = await admin.from("blog_profiles").select("user_id, naver_blog_id").in("user_id", userIds);
  const blogIdOf = new Map<string, string | null>((profiles ?? []).map((p) => [p.user_id, p.naver_blog_id]));

  let indexed = 0, pending = 0, unknown = 0;
  for (const r of rows) {
    const found = await checkIndexed(r.title ?? "", blogIdOf.get(r.user_id) ?? null);
    const status = found === null ? "unknown" : found ? "indexed" : "pending";
    if (status === "indexed") indexed++; else if (status === "pending") pending++; else unknown++;
    try {
      await admin.from("articles").update({ indexed_status: status, indexed_at: new Date().toISOString() }).eq("id", r.id);
    } catch { /* 개별 실패 무시 */ }
  }
  return NextResponse.json({ ok: true, scanned: rows.length, indexed, pending, unknown });
}
