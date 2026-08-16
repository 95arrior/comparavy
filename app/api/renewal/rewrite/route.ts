import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { FF } from "@/config/featureFlags";
import { generateArticle } from "@/lib/generateArticle";
import { spendCredits, addCredits } from "@/lib/credits";
import { GENERATE_COST } from "@/lib/creditPacks";
import { financeCalcContext } from "@/lib/financeCalc";
import { stylePersonaInstruction } from "@/lib/stylePersona";

// ★갱신 다시쓰기(2026-07-17) — 같은 글(articles row)의 본문을 최신 기준으로 재생성한다.
//  새 글 발행이 아니라 기존 글 갱신: WP는 재발행 시 같은 wp_post_id로 업데이트, 네이버는 유저가 수정 복붙.
//  제목은 유지(검색 유입이 걸려 있는 자산) — 제목의 약속을 새 본문이 최신 기준으로 다시 이행한다.
export const maxDuration = 300;

export async function POST(request: Request) {
  if (!FF.revisionScan) return NextResponse.json({ error: "기능이 꺼져 있어요." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  const admin = createSupabaseAdminClient();

  const { data: q } = await admin.from("renewal_queue")
    .select("id, article_id, season_label, status")
    .eq("id", body.id).eq("user_id", user.id).maybeSingle();
  if (!q || q.status !== "pending") return NextResponse.json({ error: "갱신 대상을 찾지 못했어요." }, { status: 404 });
  const { data: art } = await admin.from("articles")
    .select("id, blog_id, keyword, title, channel, naver_url, wp_post_id")
    .eq("id", q.article_id).eq("user_id", user.id).maybeSingle();
  if (!art?.keyword) return NextResponse.json({ error: "원본 글을 찾지 못했어요." }, { status: 404 });

  const channel = ((art as { channel?: string | null }).channel === "naver" || (art as { naver_url?: string | null }).naver_url) ? ("naver" as const) : ("wordpress" as const);
  let vertical = "online", tone = "friendly";
  if (art.blog_id) {
    const { data: prof } = await admin.from("blog_profiles").select("vertical, tone").eq("id", art.blog_id).maybeSingle();
    vertical = (prof as { vertical?: string | null } | null)?.vertical || "online";
    tone = (prof as { tone?: string | null } | null)?.tone || "friendly";
  }

  const refundRef = `renewal-${q.id}`;
  const spent = await spendCredits(user.id, GENERATE_COST, "renewal", refundRef);
  if (spent === null) return NextResponse.json({ error: "크레딧이 없어요. 크레딧을 충전하면 바로 이어서 쓸 수 있어요.", code: "NO_CREDITS" }, { status: 402 });

  try {
    const article = await generateArticle({
      keyword: String(art.keyword), channel, angle: undefined, type: "info", tone, maxWords: 5000,
      variantInstruction: `★갱신 다시쓰기: 이 글은 '${q.season_label}'에 걸린 기존 발행 글의 갱신본이다. web_search로 최신 기준(세율·한도·요율·일정)을 반드시 확인하고, 바뀐 수치·제도를 반영해 처음부터 다시 써라. '최근 무엇이 어떻게 바뀌었는지' 짚는 문단을 1개 넣는다(검색자들이 "바뀌었나?"를 실제로 검색한다). 주제·검색 의도·제목의 약속은 기존 그대로 유지한다.`,
      styleInstruction: art.blog_id ? stylePersonaInstruction(String(art.blog_id)) : "",
      relatedQueries: [], newsContext: undefined, angleBrief: null, affiliate: false,
      vertical, bizName: null, bizStrength: null, userStory: null, userTitle: String(art.title ?? ""),
      calcContext: financeCalcContext(String(art.keyword)), // ★검증된 계산 자료 — 시뮬 숫자는 코드가 계산
    });
    const { error: upErr } = await admin.from("articles").update({
      body_html: article.body_html,
      meta_title: article.meta_title, meta_description: article.meta_description,
      faq: article.faq, tags: article.tags ?? [],
    }).eq("id", art.id);
    if (upErr) throw new Error(upErr.message);
    await admin.from("renewal_queue").update({ status: "done" }).eq("id", q.id);
    // body_html을 함께 반환 — 클라이언트 글 목록 상태가 초기 로드본이라, 재조회 없이 갱신본으로 동기화
    return NextResponse.json({ ok: true, articleId: art.id, channel, body_html: article.body_html });
  } catch (e) {
    console.error("[renewal-rewrite] 실패:", e instanceof Error ? e.message : e);
    await addCredits(user.id, GENERATE_COST, "refund_renewal", refundRef).catch(() => null); // 멱등 환불
    return NextResponse.json({ error: "다시 쓰는 중 문제가 생겼어요. 크레딧은 차감되지 않았어요." }, { status: 500 });
  }
}
