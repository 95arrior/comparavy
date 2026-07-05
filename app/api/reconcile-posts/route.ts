import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { fetchBlogRss, titleSimilarity } from "@/lib/naverRss";
import { checkRateLimit } from "@/lib/rateLimit";

export const maxDuration = 30;

// ★발행 유실 자동 회수(실측: '발행까지 끝냈어요' 안 누르고 닫으면 실제 발행 글이 초안으로 남음 — 9편 발행/7편 집계).
//  수동 버튼 대신: 유저 블로그 RSS를 읽어 초안·복사됨 글 제목이 실제로 올라가 있으면 발행됨(verified)으로 승격.
//  안전: 유사도 0.6+(RSS 검증과 동일 기준), 글이 속한 블로그의 RSS로만 대조(레거시 null은 전 블로그).
export async function POST() {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const rl = await checkRateLimit(supabase, user.id, "reconcile", 6, 3600); // RSS 예의 — 시간당 6회
  if (!rl.ok) return NextResponse.json({ recovered: 0, skipped: true });

  const { data: drafts } = await supabase.from("articles")
    .select("id, title, blog_id, status")
    .eq("user_id", user.id)
    .in("status", ["draft", "copied"])
    .order("created_at", { ascending: false })
    .limit(40);
  if (!drafts?.length) return NextResponse.json({ recovered: 0 });

  const { data: profs } = await supabase.from("blog_profiles").select("id, naver_blog_id").eq("user_id", user.id);
  const rssByBlog = new Map<string, Awaited<ReturnType<typeof fetchBlogRss>>>();
  for (const p of profs ?? []) {
    if (!p.naver_blog_id) continue;
    try { rssByBlog.set(p.id as string, await fetchBlogRss(p.naver_blog_id as string)); } catch { /* RSS 실패 = 그 블로그 건너뜀 */ }
  }
  if (rssByBlog.size === 0) return NextResponse.json({ recovered: 0, reason: "no_blog_id" });

  let recovered = 0;
  const recoveredIds: string[] = [];
  for (const d of drafts) {
    const pools = d.blog_id && rssByBlog.has(d.blog_id) ? [rssByBlog.get(d.blog_id)!] : [...rssByBlog.values()];
    for (const items of pools) {
      const hit = items.find((it) => titleSimilarity(it.title, d.title) >= 0.6);
      if (hit) {
        const { error } = await supabase.from("articles").update({
          status: "verified", naver_url: hit.link || null, verified_at: new Date().toISOString(),
        }).eq("id", d.id).eq("user_id", user.id);
        if (!error) { recovered++; recoveredIds.push(d.id); }
        break;
      }
    }
  }
  return NextResponse.json({ recovered, ids: recoveredIds });
}
