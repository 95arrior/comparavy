import { NextResponse } from "next/server";
import { createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { generateArticle } from "@/lib/generateArticle";
import { pickWpTopic } from "@/lib/googleTopics";
import { publishPost } from "@/lib/wordpress";
import { decryptSecret } from "@/lib/crypto";
import { spendCredits, addCredits } from "@/lib/credits";
import { WP_GENERATE_COST } from "@/lib/creditPacks";
import { stylePersonaInstruction } from "@/lib/stylePersona";
import { logUsage } from "@/lib/usageLog";

// ★WP 자동 발행(Phase 2 모듈 B) — 매시 실행, auto_publish_hour(KST)가 지금인 WP 블로그만 처리.
//  daily=생성→즉시 발행 / review=생성만(아침 승인탭에서 유저가 발행). 크레딧 선차감·실패 멱등 환불.
//  Helpful Content 방어: 블로그당 일 1편 상한(도배 = 사이트 전체 강등 리스크).
export const maxDuration = 300;

function kstHour(): number { return (new Date().getUTCHours() + 9) % 24; }
function kstDay(): string { const d = new Date(Date.now() + 9 * 3600_000); return d.toISOString().slice(0, 10); }

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}` && request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const db = createSupabaseAdminClient();
  const hour = kstHour();

  const { data: blogs } = await db.from("blog_profiles")
    .select("id, user_id, sub_category, topic, auto_publish, auto_publish_hour, tone")
    .eq("channel", "wordpress").neq("auto_publish", "off").eq("auto_publish_hour", hour);
  if (!blogs?.length) return NextResponse.json({ ok: true, processed: 0 });

  const results: { blog: string; result: string }[] = [];
  for (const b of blogs) {
    try {
      // 일 1편 상한 — 오늘 이미 이 블로그에 자동 생성분 있으면 스킵
      const { data: today } = await db.from("articles").select("id").eq("blog_id", b.id)
        .gte("created_at", `${kstDay()}T00:00:00+09:00`).limit(1);
      if (today?.length) { results.push({ blog: b.id, result: "already_today" }); continue; }

      // WP 연결 확인(블로그 귀속 우선, 레거시 user 단위 폴백)
      let { data: conn } = await db.from("wordpress_connections").select("site_url, username, app_password").eq("blog_id", b.id).maybeSingle();
      if (!conn) ({ data: conn } = await db.from("wordpress_connections").select("site_url, username, app_password").eq("user_id", b.user_id).maybeSingle());
      if (!conn) { results.push({ blog: b.id, result: "no_connection" }); continue; }

      const sub = b.sub_category || b.topic || "";
      const pick = await pickWpTopic(b.user_id, sub);
      if (!pick) { results.push({ blog: b.id, result: "no_topic" }); continue; }

      const balance = await spendCredits(b.user_id, WP_GENERATE_COST, "wp_auto");
      if (balance === null) { results.push({ blog: b.id, result: "no_credits" }); continue; }

      try {
        const article = await generateArticle({
          keyword: pick.keyword, channel: "wordpress", angle: undefined, type: "info", tone: b.tone || "friendly", maxWords: 5000,
          variantInstruction: "", styleInstruction: stylePersonaInstruction(b.id),
          relatedQueries: [], newsContext: undefined, angleBrief: null, affiliate: false,
          vertical: "online", bizName: null, bizStrength: null, userStory: null, userTitle: null,
        });
        // WP 후처리 — 네이버 포맷터(스페이서·형광펜) 미적용. 마커만 정리.
        const body = article.body_html
          .replace(/\[내부링크:[^\]]*\]/g, "") // 발행 코어의 insertInternalLinks가 실링크 처리
          .replace(/\[사진[^\]]*\]/g, "");
        const ins = {
          user_id: b.user_id, blog_id: b.id, keyword: pick.keyword, title: article.title,
          meta_title: article.meta_title, meta_description: article.meta_description,
          body_html: body, original_html: body, faq: article.faq, tags: article.tags ?? [],
          char_count: body.replace(/<[^>]+>/g, "").length, article_type: "info", channel: "wordpress",
          status: "draft",
        } as Record<string, unknown>;
        const { data: saved, error } = await db.from("articles").insert(ins).select("id, title, body_html, meta_title, meta_description, faq, tags, keyword").single();
        if (error || !saved) throw new Error(error?.message ?? "insert fail");

        if (b.auto_publish === "daily") {
          const r = await publishPost({
            siteUrl: conn.site_url, username: conn.username, appPassword: decryptSecret(conn.app_password),
            title: saved.title, contentHtml: saved.body_html,
            metaDescription: saved.meta_description ?? undefined, metaTitle: saved.meta_title ?? undefined,
            faq: Array.isArray(saved.faq) ? saved.faq : undefined,
            tags: Array.isArray(saved.tags) ? (saved.tags as string[]) : undefined,
            addToc: true, ymyl: false, status: "publish",
          });
          await db.from("articles").update({ status: "published", wp_post_id: r.id, wp_link: r.link, publish_at: new Date().toISOString() }).eq("id", saved.id);
          results.push({ blog: b.id, result: "published" });
        } else {
          results.push({ blog: b.id, result: "review_ready" }); // 아침 승인탭 대기(draft)
        }
        void logUsage({ userId: b.user_id, model: "wp-auto", kind: "wp_autopublish", inputTokens: 0, outputTokens: 0 });
      } catch (e) {
        await addCredits(b.user_id, WP_GENERATE_COST, "refund_wp_auto", `wpauto-${b.id}-${kstDay()}`).catch(() => null); // 멱등 환불
        results.push({ blog: b.id, result: `fail:${e instanceof Error ? e.message.slice(0, 60) : "?"}` });
      }
    } catch (e) {
      results.push({ blog: b.id, result: `outer:${e instanceof Error ? e.message.slice(0, 60) : "?"}` });
    }
  }
  return NextResponse.json({ ok: true, processed: results.length, results });
}
