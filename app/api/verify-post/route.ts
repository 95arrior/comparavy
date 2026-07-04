import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { verifyTitleInBlog, checkPostDeleted, parseNaverBlogId } from "@/lib/naverRss";
import { logUsage } from "@/lib/usageLog";

// ★발행 검증 즉시 1차 — '발행까지 끝냈어요' 직후 호출. RSS 매칭 성공 → verified.
//  실패 = 즉시 실패 아님(pending_verify 유지, 크론이 10분×6 재시도). 수동 URL 폴백도 이 라우트(body.url).
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = typeof body.articleId === "string" ? body.articleId.slice(0, 60) : "";
  if (!id) return NextResponse.json({ error: "bad" }, { status: 400 });

  const { data: art } = await supabase.from("articles").select("id, title, status, claimed_at").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!art) return NextResponse.json({ error: "글 없음" }, { status: 404 });
  if (art.status === "verified" || art.status === "published") return NextResponse.json({ ok: true, state: "verified" });

  // ── 수동 URL 폴백(재시도 소진 시 UI가 보냄) — URL이 살아있는 글이면 verified ──
  if (typeof body.url === "string" && body.url.trim()) {
    const url = body.url.trim().slice(0, 300);
    if (!/blog\.naver\.com/.test(url)) return NextResponse.json({ error: "네이버 블로그 글 주소를 붙여넣어 주세요." }, { status: 400 });
    const verdict = await checkPostDeleted(url);
    if (verdict === "deleted") return NextResponse.json({ error: "이 주소의 글을 찾지 못했어요. 발행된 글 주소인지 확인해 주세요." }, { status: 400 });
    await supabase.from("articles").update({ status: "verified", naver_url: url, verified_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
    void logUsage({ userId: user.id, model: "rss", kind: "verify_manual_url", inputTokens: 0, outputTokens: 0 });
    return NextResponse.json({ ok: true, state: "verified" });
  }

  // ── RSS 1차 매칭 ──
  // ★blogId 해석은 '이 글이 속한 프로필' 기준 — 지금은 계정=프로필 1:1이라 user_id 조회.
  //  Stage 5(멀티 블로그): 여기만 articles.blog_id → blog_profiles.id 경유로 교체(verifyTitleInBlog 시그니처는 그대로).
  const { data: prof } = await supabase.from("blog_profiles").select("naver_blog_id").eq("user_id", user.id).maybeSingle();
  let blogId = prof?.naver_blog_id ?? null;
  if (!blogId && typeof body.blogId === "string") { // 위저드에서 방금 입력받은 경우 — 파싱해 저장
    blogId = parseNaverBlogId(body.blogId);
    if (blogId) await supabase.from("blog_profiles").update({ naver_blog_id: blogId }).eq("user_id", user.id);
  }
  if (!blogId) return NextResponse.json({ ok: false, state: "need_blog_id" });

  const claimed = art.claimed_at ? new Date(art.claimed_at).getTime() : Date.now();
  const hit = await verifyTitleInBlog(blogId, art.title, claimed); // 명시 blogId — 이 글의 블로그에서만 매칭
  if (hit) {
    await supabase.from("articles").update({ status: "verified", naver_url: hit.link, verified_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
    void logUsage({ userId: user.id, model: "rss", kind: "verify_hit_instant", inputTokens: 0, outputTokens: 0 });
    return NextResponse.json({ ok: true, state: "verified" });
  }
  // 미스 — pending 유지(크론 재시도), 시도 1 기록
  await supabase.from("articles").update({ verify_attempts: 1 }).eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true, state: "pending" });
}
