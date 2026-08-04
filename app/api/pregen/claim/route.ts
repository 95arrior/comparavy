import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { spendCredits, addCredits, GENERATE_COST } from "@/lib/credits";
import { logUsage } from "@/lib/usageLog";
import { finalizeArticleBody } from "@/lib/finalizeBody";
import { relatedPostsFor } from "@/lib/relatedPosts";

// ★열람 = 차감(claim) — 사전 생성분을 여는 순간에만 크레딧 차감. 이중 차감 불가:
//  ①이미 draft(중복 claim·다른 탭)면 차감 없이 그대로 반환 ②차감 후 조건부 전환 실패(레이스)면 멱등 환불.
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = typeof body.articleId === "string" ? body.articleId.slice(0, 60) : "";
  if (!id) return NextResponse.json({ error: "bad" }, { status: 400 });

  const { data: row } = await supabase.from("articles").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!row) return NextResponse.json({ error: "글을 찾을 수 없어요." }, { status: 404 });
  if (row.status === "draft" || row.status === "published") {
    return NextResponse.json({ ok: true, article: row, alreadyClaimed: true }); // 중복 claim — 차감 0
  }
  if (row.status !== "pre_generated") return NextResponse.json({ error: "아직 준비 중이에요.", code: "NOT_READY" }, { status: 409 });

  const balance = await spendCredits(user.id, GENERATE_COST, "generate");
  if (balance === null) return NextResponse.json({ error: "크레딧이 부족해요.", code: "NO_CREDITS" }, { status: 402 });

  const { data: updated } = await supabase.from("articles").update({ status: "draft" })
    .eq("id", id).eq("user_id", user.id).eq("status", "pre_generated").select("*").maybeSingle();
  if (!updated) {
    // 레이스(다른 탭이 먼저 전환) — 멱등 환불(articleId를 ref로: 같은 사고 재시도에도 1회만)
    await addCredits(user.id, GENERATE_COST, "refund_claim", `claim-${id}`).catch(() => null);
    const { data: cur } = await supabase.from("articles").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
    return NextResponse.json({ ok: true, article: cur, alreadyClaimed: true });
  }
  void logUsage({ userId: user.id, model: "pregen", kind: "pregen_hit", inputTokens: 0, outputTokens: 0 });

  // ★열람 시점 마감 재적용(2026-08-05 유저: "해시태그랑 기존 글 유입 링크가 또 없어졌어요").
  //  사전 생성분은 '미리' 만들어진다 — 마감 규칙을 고쳐도, 그 전에 만들어져 대기 중이던 글은 옛 몸이다.
  //  ★그래서 여는 순간 마감을 한 번 더 태운다. finalizeArticleBody는 멱등이다(마커를 걷고 다시 붙이고,
  //   해시태그는 이미 3개 이상이면 손대지 않는다) — 이미 마감된 글에 두 번 걸어도 같은 결과다.
  //  이렇게 해두면 앞으로 마감 규칙이 바뀌어도 대기 중인 사전 생성분이 옛 규칙으로 나가지 않는다.
  let article = updated;
  try {
    const { data: prof } = await supabase.from("blog_profiles").select("id, naver_blog_id").eq("user_id", user.id).eq("is_active", true).maybeSingle();
    const related = await relatedPostsFor(supabase, user.id, (prof as { id?: string } | null)?.id ?? null, String(updated.keyword ?? ""));
    const fin = finalizeArticleBody({
      bodyHtml: String(updated.body_html ?? ""),
      keyword: String(updated.keyword ?? ""),
      isReview: false,
      ownNaverBlogId: (prof as { naver_blog_id?: string | null } | null)?.naver_blog_id ?? null,
      relatedPosts: related,
      modelTags: updated.tags,
    });
    if (fin.html !== updated.body_html) {
      const { data: re } = await supabase.from("articles").update({ body_html: fin.html, char_count: fin.charCount })
        .eq("id", id).eq("user_id", user.id).select("*").maybeSingle();
      if (re) article = re;
      console.log(`[finalize] claim user=${user.id.slice(0, 8)} 마감 재적용 — 관련글 ${fin.relatedAdded}개(후보 ${related.length}) · ${fin.charCount}자`);
    }
  } catch { /* 마감 재적용 실패 — 원본 그대로 연다(열람 자체를 막지 않는다) */ }

  return NextResponse.json({ ok: true, article, credits: balance });
}
