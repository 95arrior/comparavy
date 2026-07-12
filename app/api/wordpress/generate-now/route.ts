import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { generateArticle } from "@/lib/generateArticle";
import { pickWpTopic } from "@/lib/googleTopics";
import { adsenseUnsafe } from "@/lib/cardFinalGate";
import { spendCredits, addCredits } from "@/lib/credits";
import { WP_GENERATE_COST } from "@/lib/creditPacks";
import { stripNaverArtifacts } from "@/lib/wordpress";
import { stylePersonaInstruction } from "@/lib/stylePersona";
import { logUsage } from "@/lib/usageLog";

// ★첫 글 지금 만들기(2026-07-12 WP 재점화 — 실주행 구멍 수리) — 크론(wp-autopublish)과 동일 파이프의 수동 트리거.
//  연결 직후 유저가 다음 크론 시각까지 기다리지 않고 통합 테스트·첫 발행을 할 수 있게. 항상 승인 모드(draft)로만 생성.
//  안전선: 블로그당 일 1편 상한(크론과 공유 — 오늘 이미 자동 생성분이 있으면 거절), 크레딧 선차감·실패 환불.
export const maxDuration = 300;

function kstDay(): string { return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10); }

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const { data: b } = await supabase.from("blog_profiles")
    .select("id, sub_category, topic, tone, channel")
    .eq("user_id", user.id).eq("is_active", true).maybeSingle();
  if (!b || (b as { channel?: string }).channel !== "wordpress") {
    return NextResponse.json({ error: "워드프레스 블로그가 활성 상태일 때 쓸 수 있어요." }, { status: 400 });
  }
  const db = createSupabaseAdminClient();

  // 일 1편 상한 — 크론과 동일 기준(오늘 이 블로그 생성분)
  const { data: today } = await db.from("articles").select("id, status, title").eq("blog_id", b.id)
    .gte("created_at", `${kstDay()}T00:00:00+09:00`).limit(1);
  if (today?.length) return NextResponse.json({ error: "오늘 글은 이미 준비돼 있어요. 사이트 건강을 위해 하루 한 편이 안전선이에요." }, { status: 429 });

  const sub = b.sub_category || (b as { topic?: string }).topic || "";
  const pick = await pickWpTopic(user.id, sub);
  if (!pick) return NextResponse.json({ error: "지금 쓸 수 있는 글감을 찾지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 404 });
  const bad = adsenseUnsafe(pick.keyword);
  if (bad) return NextResponse.json({ error: "광고 정책에 맞지 않는 주제가 걸러졌어요. 다시 시도해 주세요." }, { status: 409 });

  const balance = await spendCredits(user.id, WP_GENERATE_COST, "wp_auto");
  if (balance === null) return NextResponse.json({ error: "크레딧이 부족해요.", code: "NO_CREDITS" }, { status: 402 });

  try {
    const article = await generateArticle({
      keyword: pick.keyword, channel: "wordpress", angle: undefined, type: "info", tone: (b as { tone?: string }).tone || "friendly", maxWords: 5000,
      variantInstruction: "", styleInstruction: stylePersonaInstruction(b.id),
      relatedQueries: [], newsContext: undefined, angleBrief: null, affiliate: false,
      vertical: "online", bizName: null, bizStrength: null, userStory: null, userTitle: null,
    });
    const body = stripNaverArtifacts(article.body_html); // 해시태그·마커 일괄 소거(중앙 소거기)
    const ins = {
      user_id: user.id, blog_id: b.id, keyword: pick.keyword, title: article.title,
      meta_title: article.meta_title, meta_description: article.meta_description,
      body_html: body, original_html: body, faq: article.faq, tags: article.tags ?? [],
      char_count: body.replace(/<[^>]+>/g, "").length, article_type: "info", channel: "wordpress",
      status: "draft",
    } as Record<string, unknown>;
    const { data: saved, error } = await db.from("articles").insert(ins).select("id, title").single();
    if (error || !saved) throw new Error(error?.message ?? "insert fail");
    void logUsage({ userId: user.id, model: "wp-auto", kind: "wp_generate_now", inputTokens: 0, outputTokens: 0 });
    return NextResponse.json({ ok: true, id: saved.id, title: saved.title, credits: balance });
  } catch (e) {
    await addCredits(user.id, WP_GENERATE_COST, "refund_wp_auto", `wpnow-${b.id}-${kstDay()}`).catch(() => null);
    return NextResponse.json({ error: `글을 만들지 못했어요. 크레딧은 돌려드렸어요. (${e instanceof Error ? e.message.slice(0, 60) : "오류"})` }, { status: 502 });
  }
}
