import { NextResponse, after } from "next/server";
import { fetchTopPosts } from "@/lib/naverBlogSearch";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { generateArticle } from "@/lib/generateArticle";
import { isReviewType, ensureDisclosure } from "@/lib/revenue";
import { stripTitleDash, hasFabricatedExperience } from "@/lib/editorial";
import { sanitizeUrls } from "@/lib/linkWhitelist";
import { countBodyChars } from "@/lib/humanizer";
import { finalizeArticleBody } from "@/lib/finalizeBody";
import { leadTagFor } from "@/lib/adBid";
import { relatedPostsFor } from "@/lib/relatedPosts";
import { normalizeKeyword, pickVariant, pickAngle, simhash } from "@/lib/diversity";
import { isAdminEmail } from "@/lib/adminStats";
import { logUsage } from "@/lib/usageLog";
import { VERTICAL_DEFAULTS } from "@/lib/blogProfile";
import { stylePersonaInstruction } from "@/lib/stylePersona";
import { newsContextFor } from "@/lib/newsTopics";
import { isTimeSensitive } from "@/lib/timeSensitive";
import { fetchNaverAutocomplete } from "@/lib/naverAutocomplete";
import { PROMPT_SPEC_VERSION } from "@/lib/articlePrompt";

// ★사전 생성(생성 경험 v2) — 홈 진입 트리거로 '오늘의 글' 1편을 백그라운드 생성(after(), 크론 금지).
//  크레딧 정책: 여기서는 차감 0. 차감은 열람(claim) 시점에만. 미열람분은 다음 진입 시 lazy 만료(원가=회사 부담, pregen_expired 로그).
//  입력 조립은 generate 라우트와 동기 유지(다양성·페르소나·뉴스·자동완성·후처리 동일 — 같은 품질의 같은 글이어야 함).
export const maxDuration = 300; // after() 백그라운드 생성 여유(Vercel Fluid — 응답 후 실행 검증 패턴: topics 라우트)

const kstDay = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

export async function GET(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const keyword = new URL(request.url).searchParams.get("keyword")?.trim().slice(0, 80) ?? "";
  if (!keyword) return NextResponse.json({ status: "none" });
  const { data } = await supabase.from("articles").select("id, status, created_at").eq("user_id", user.id).eq("keyword", keyword)
    .in("status", ["pre_generating", "pre_generated"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return NextResponse.json({ status: "none" });
  const today = new Date(data.created_at).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)
    || new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10) === new Date(new Date(data.created_at).getTime() + 9 * 3600_000).toISOString().slice(0, 10);
  if (!today) return NextResponse.json({ status: "none" });
  return NextResponse.json({ status: data.status === "pre_generated" ? "ready" : "generating", articleId: data.id }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  if (process.env.PRELAUNCH === "true" && !isAdminEmail(user.email)) return NextResponse.json({ status: "skip" });

  const body = await request.json().catch(() => ({}));
  const keyword = String(body.keyword ?? "").trim().slice(0, 80);
  const title = String(body.title ?? "").trim().slice(0, 120);
  if (!keyword || !title) return NextResponse.json({ error: "bad" }, { status: 400 });

  // ★lazy 만료 — 전날 미열람 사전 생성분 폐기(차감 0이었으므로 무해, 원가는 회사 부담으로 로그)
  const todayStartKst = new Date(); todayStartKst.setHours(0, 0, 0, 0);
  // ★규격이 바뀌면 오늘 만든 것도 폐기한다(2026-08-05 실측).
  //  종전엔 '자정 이전'만 만료라, 낮에 본문 규격을 바꿔도 그날 미리 만든 글은 옛 규격으로 나갔다.
  //  ★유저가 새 이미지 마커를 못 본 이유가 이것이었다 — 배포는 됐는데 글이 어제 규격이었다.
  const { data: pend } = await supabase.from("articles").select("id, created_at, selection_meta").eq("user_id", user.id)
    .in("status", ["pre_generating", "pre_generated"]);
  const stale = (pend ?? []).filter((r) => {
    if (new Date(String(r.created_at)).getTime() < todayStartKst.getTime()) return true;
    const v = Number((r.selection_meta as { specV?: number } | null)?.specV ?? 0);
    return v !== PROMPT_SPEC_VERSION; // 규격이 다르면 오늘 것이어도 버린다
  });
  if (stale && stale.length > 0) {
    await supabase.from("articles").delete().in("id", stale.map((s) => s.id));
    void logUsage({ userId: user.id, model: "pregen", kind: "pregen_expired", inputTokens: 0, outputTokens: stale.length });
    console.log(`[pregen] expired=${stale.length} user=${user.id.slice(0, 8)} (규격 v${PROMPT_SPEC_VERSION})`);
  }

  // 중복 방지 — 오늘 같은 키워드로 사전 생성/초안/발행이 이미 있으면 재트리거 금지
  const { data: dup } = await supabase.from("articles").select("id, status").eq("user_id", user.id).eq("keyword", keyword)
    .gte("created_at", todayStartKst.toISOString()).in("status", ["pre_generating", "pre_generated", "draft", "published"]).limit(1).maybeSingle();
  if (dup) return NextResponse.json({ status: dup.status === "pre_generated" ? "ready" : "exists", articleId: dup.id });

  // 자리표시 행 — 진행 중 표식(중복 트리거 차단의 실체)
  const { data: ph, error: phErr } = await supabase.from("articles")
    .insert({ user_id: user.id, keyword, title, body_html: "", char_count: 0, status: "pre_generating", selection_meta: { specV: PROMPT_SPEC_VERSION } })
    .select("id").single();
  if (phErr || !ph) return NextResponse.json({ status: "skip" });
  const phId = ph.id as string;
  const t0 = Date.now();
  void logUsage({ userId: user.id, model: "pregen", kind: "pregen_start", inputTokens: 0, outputTokens: 0 });

  // ── 입력 조립(generate 라우트와 동기) ──
  const adminDb = createSupabaseAdminClient();
  const { data: profileRow } = await supabase.from("blog_profiles")
    .select("id,naver_blog_id,vertical,sub_category,biz_name,biz_strength,audience").eq("user_id", user.id).eq("is_active", true).maybeSingle();
  const vertical = profileRow?.vertical ?? "general";
  const seedId = (profileRow as { id?: string } | null)?.id ?? user.id; // 블로그별 지문
  const vDef = VERTICAL_DEFAULTS[vertical];
  const type = vDef?.type ?? "howto";
  const tone = vDef?.tone ?? "friendly";
  const briefText = typeof body.briefText === "string" ? body.briefText.slice(0, 900) : null;
  const briefIntent = briefText ? (/의도:\s*([^\n]+)/.exec(briefText)?.[1] ?? null) : null;
  const isReview = isReviewType({ keyword, title, intent: briefIntent, promo: false });
  const keywordNorm = normalizeKeyword(keyword);
  const { data: usedRows } = await supabase.from("article_patterns").select("signature").eq("user_id", user.id).eq("keyword_norm", keywordNorm);
  const usedSignatures = (usedRows ?? []).map((r: { signature: string }) => r.signature);
  const variant = pickVariant(usedSignatures, `${seedId}:${keywordNorm}:${usedSignatures.length}`);
  const angleAxis = pickAngle(`${seedId}:${keywordNorm}`);
  const CUR_YEAR = String(new Date(Date.now() + 9 * 3600_000).getFullYear());
  const angle = title.replace(/20(1[0-9]|2[0-5])/g, CUR_YEAR);

  after(async () => {
    try {
      const timeSens = isTimeSensitive({ keyword, angle, vertical, newsContext: body.newsContext });
      const numericSens = /금리|대출|지원금|보조금|세금|환급|연금|보험료|요금|수수료|한도|공제|청약|재난지원/.test(keyword); // 수치 민감 — 사전 생성도 최신 발췌
      const resolvedNews: string | null = typeof body.newsContext === "string" && body.newsContext.trim()
        ? String(body.newsContext).slice(0, 1600)
        : (timeSens || numericSens) ? await newsContextFor(keyword).then((v) => (v ? v.slice(0, 1600) : null)).catch(() => null) : null;
      let relatedQueries: string[] = [];
      try {
        relatedQueries = await Promise.race([
          fetchNaverAutocomplete(keyword),
          new Promise<string[]>((r) => setTimeout(() => r([]), 2500)),
        ]);
      } catch { /* best-effort */ }

      const topPosts = await fetchTopPosts(keyword, 5).catch(() => []);
      const serpContext = topPosts.length ? topPosts.map((t, i) => `${i + 1}. ${t.title} — ${t.description.slice(0, 90)}`).join("\n") : null;
      const article = await generateArticle({
        serpContext,
        keyword, angle, type, tone, maxWords: 5000,
        variantInstruction: `${variant.instruction} ${angleAxis}`,
        styleInstruction: stylePersonaInstruction(seedId),
        relatedQueries, newsContext: resolvedNews, angleBrief: briefText,
        affiliate: isReview, vertical, bizName: null, bizStrength: null, userStory: null,
        userTitle: typeof body.userTitle === "string" ? body.userTitle.slice(0, 120) : null,
      });
      void logUsage({ userId: user.id, model: "pregen-generate", kind: "generate", inputTokens: 0, outputTokens: 0 });

      // ★후처리는 generate와 '같은 함수'로 한다(2026-08-04 유저 화면에서 검거).
      //  종전 이 자리 주석은 "generate와 동일"이었는데 실제로는 URL 정화까지만 있었다 —
      //  리스트→표·분량 하드컷·함께 보면 좋은 글·해시태그가 통째로 빠져 있었고,
      //  카드에서 바로 열리는 글은 대부분 이 경로라 유저가 받은 글에 링크도 태그도 없었다.
      //  ★같은 규칙을 두 곳에 복붙하지 않는다 — 마감은 finalizeArticleBody 하나뿐이다.
      if (hasFabricatedExperience(article.body_html)) throw new Error("fabricated");
      const related = await relatedPostsFor(adminDb, user.id, (profileRow as { id?: string } | null)?.id ?? null, keyword);
      const fin = finalizeArticleBody({
        bodyHtml: article.body_html, keyword, isReview,
        ownNaverBlogId: (profileRow as { naver_blog_id?: string | null } | null)?.naver_blog_id,
        relatedPosts: related, modelTags: article.tags, tag: undefined,
        // ★대표 태그(2026-08-06) — 종전엔 generate에만 있었다. 카드에서 여는 글이 다수인데
        //  그 경로엔 통째로 빠져 있어서 고단가 태그 기능이 절반만 켜져 있었다.
        leadTag: await leadTagFor(article.body_html, keyword, article.tags, "pregen"),
      });
      if (fin.urlReplaced > 0) console.log(`[url-sanitize] pregen user=${user.id.slice(0, 8)} replaced=${fin.urlReplaced}`);
      console.log(`[finalize] pregen user=${user.id.slice(0, 8)} 관련글 ${fin.relatedAdded}개(후보 ${related.length}) · ${fin.charCount}자${fin.trimmedSections.length ? ` · 섹션 제거 ${fin.trimmedSections.length}` : ""}`);
      const finalBody = fin.html;
      const charCount = fin.charCount;
      if (charCount < 500) throw new Error("too-short");

      const upPayload: Record<string, unknown> = {
        title: stripTitleDash(article.title), meta_title: article.meta_title, meta_description: article.meta_description, // ★대시 금지(2026-08-17)
        body_html: finalBody, faq: article.faq, char_count: charCount,
        simhash: simhash(article.body_html), original_html: finalBody,
        write_note: article.write_note || null, tags: article.tags ?? [],
        article_type: "info", status: "pre_generated",
        blog_id: (profileRow as { id?: string } | null)?.id ?? null, // 멀티 블로그 Phase A(0055)
      };
      let { error: upErr } = await adminDb.from("articles").update(upPayload).eq("id", phId).eq("status", "pre_generating");
      if (upErr && /blog_id/.test(upErr.message)) { // 0055 미적용 방어 — 사전 생성이 죽지 않게
        delete upPayload.blog_id;
        ({ error: upErr } = await adminDb.from("articles").update(upPayload).eq("id", phId).eq("status", "pre_generating"));
      }
      if (upErr) throw upErr;
      const ms = Date.now() - t0;
      void logUsage({ userId: user.id, model: "pregen", kind: "pregen_ready", inputTokens: 0, outputTokens: Math.round(ms / 1000) });
      console.log(`[pregen] ready in ${ms}ms user=${user.id.slice(0, 8)} kw=${keyword}`);
    } catch (e) {
      // 실패 = 침묵(유저 표시 0, 차감 0). 자리표시 삭제 → 탭 시 일반 경로 자연 폴백.
      await adminDb.from("articles").delete().eq("id", phId).eq("status", "pre_generating").then(() => undefined, () => undefined);
      void logUsage({ userId: user.id, model: "pregen", kind: "pregen_fail", inputTokens: 0, outputTokens: 0 });
      console.log(`[pregen] fail user=${user.id.slice(0, 8)}: ${e instanceof Error ? e.message : "?"}`);
    }
  });

  return NextResponse.json({ status: "started", articleId: phId });
}
