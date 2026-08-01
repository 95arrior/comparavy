import { NextResponse } from "next/server";
import { createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { generateArticle } from "@/lib/generateArticle";
import { pickWpTopic } from "@/lib/googleTopics";
import { adsenseUnsafe } from "@/lib/cardFinalGate";
import { endedProgramOf } from "@/lib/discontinued";
import { factVerdict } from "@/lib/factGate";
import { scanCompliance } from "@/lib/complianceFilter";
import { lacksInterpretation, lacksConditionBranch, isOverusedTitleShape } from "@/lib/editorial";
import { financeCalcContext } from "@/lib/financeCalc";
import { autoFeaturedImage } from "@/lib/wpFeaturedImage";
import { wpCategoryFor } from "@/lib/wpCategory";
import { generateWpBanners, generateWpBannersToStorage, insertBanners } from "@/lib/wpIllustration";
import { publishPost, stripNaverArtifacts } from "@/lib/wordpress";
import { decryptSecret } from "@/lib/crypto";
import { spendCredits, addCredits } from "@/lib/credits";
import { WP_GENERATE_COST } from "@/lib/creditPacks";
import { stylePersonaInstruction } from "@/lib/stylePersona";
import { logUsage } from "@/lib/usageLog";
import { FF } from "@/config/featureFlags";
import { WP_DAILY_CAP, WP_SECOND_SLOT_OFFSET_H } from "@/lib/scoreWeights";

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

  // ★하루 2편(유저 확정 2026-07-12) — 1편은 설정 시각, 2편은 8시간 뒤 슬롯(도배 패턴 방지 분산)
  const { data: blogsAll } = await db.from("blog_profiles")
    .select("id, user_id, sub_category, topic, auto_publish, auto_publish_hour, tone, blog_name")
    .eq("channel", "wordpress").neq("auto_publish", "off");
  const blogs = (blogsAll ?? []).filter((b) => {
    const h = Number((b as { auto_publish_hour?: number | null }).auto_publish_hour ?? -1);
    return h === hour || (WP_DAILY_CAP >= 2 && (h + WP_SECOND_SLOT_OFFSET_H) % 24 === hour);
  });
  if (!blogs.length) return NextResponse.json({ ok: true, processed: 0 });

  const results: { blog: string; result: string }[] = [];
  for (const b of blogs) {
    try {
      // ★발행 시각 지터(FF_SEED_CLAIM §5-3) — 같은 정시에 몰리는 자동발행 패턴 분산(블로그별 랜덤 지연, maxDuration 안)
      if (FF.seedClaim) await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 45_000)));
      // 일 상한(WP_DAILY_CAP=2) — 오늘 이 블로그 생성분이 상한이면 스킵
      const { data: today } = await db.from("articles").select("id").eq("blog_id", b.id)
        .gte("created_at", `${kstDay()}T00:00:00+09:00`).limit(WP_DAILY_CAP);
      if ((today?.length ?? 0) >= WP_DAILY_CAP) { results.push({ blog: b.id, result: "cap_reached" }); continue; }

      // WP 연결 확인(블로그 귀속 우선, 레거시 user 단위 폴백)
      let { data: conn } = await db.from("wordpress_connections").select("site_url, username, app_password").eq("blog_id", b.id).maybeSingle();
      if (!conn) ({ data: conn } = await db.from("wordpress_connections").select("site_url, username, app_password").eq("user_id", b.user_id).maybeSingle());
      if (!conn) { results.push({ blog: b.id, result: "no_connection" }); continue; }

      const sub = b.sub_category || b.topic || "";
      const pick = await pickWpTopic(b.user_id, sub);
      if (!pick) { results.push({ blog: b.id, result: "no_topic" }); continue; }
      // ★애드센스 정책 이중 가드(2026-07-12) — 선별이 걸렀어도 발행 직전 최종 확인(광고 정책 위반 글 자동발행 금지)
      { const bad = adsenseUnsafe(pick.keyword); if (bad) { results.push({ blog: b.id, result: `adsense_unsafe:${bad}` }); continue; } }
      // ★폐지·종료 제도 스킵(2026-08-01) — WP는 finalGate를 타지 않으므로 여기서 따로 막는다.
      //  '재형저축'처럼 지금 가입이 안 되는 제도로 글을 쓰면 독자가 헛걸음한다.
      { const ep = endedProgramOf(pick.keyword); if (ep) { results.push({ blog: b.id, result: `ended_program:${ep.name}` }); continue; } }

      const balance = await spendCredits(b.user_id, WP_GENERATE_COST, "wp_auto");
      if (balance === null) { results.push({ blog: b.id, result: "no_credits" }); continue; }

      try {
        const genInput = {
          keyword: pick.keyword, channel: "wordpress" as const, angle: undefined, type: "info" as const, tone: b.tone || "friendly", maxWords: 5000,
          variantInstruction: "", styleInstruction: stylePersonaInstruction(b.id),
          relatedQueries: pick.suggests ?? [], newsContext: undefined, angleBrief: null, affiliate: false, // ★파생 키워드 주입
          vertical: "online", bizName: null, bizStrength: null, userStory: null, userTitle: null,
          calcContext: financeCalcContext(pick.keyword), // ★검증된 계산 자료 — 시뮬 숫자는 코드가 계산(2026-07-17)
        };
        let article = await generateArticle(genInput);
        // ★분량 상한 게이트(2026-07-15 — generate 라우트와 동일 원칙: 프롬프트는 방향, 코드는 한계선).
        //  WP 상한 2,200의 +15% 초과 시 압축 재생성 1회, 그래도 초과면 통과(로그만).
        {
          const lenCap = Math.round(2200 * 1.15);
          const chars = (h: string) => h.replace(/<[^>]+>/g, "").replace(/\s+/g, "").length;
          const c0 = chars(article.body_html);
          if (c0 > lenCap) {
            try {
              const compact = await generateArticle({ ...genInput, variantInstruction: `★경고: 직전 생성이 공백 제외 ${c0.toLocaleString()}자로 상한을 크게 초과했다. 반드시 1,800~2,200자(공백 제외) 안에서 끝내라 — 곁가지 소제목을 통째로 버리고 문단당 문장 수를 줄여라. 핵심 답·수치·표·FAQ는 유지.` });
              const c1 = chars(compact.body_html);
              if (c1 >= 500 && c1 < c0) article = compact;
              else console.log(`[wp-auto][overlength] blog=${b.id} chars=${c0}→${c1} — 압축 실패, 원본 통과`);
            } catch { /* 압축 실패 — 원본 그대로 */ }
          }
        }
        // ★해석 문단 게이트(2026-07-17 전략 회의) — 경제 글이 제도·수치 나열로 끝나면 AI 요약이 종결(제로클릭).
        //  해석·판단 신호 바닥 미달 시 재생성 1회, 그래도 미달이면 통과(분량 게이트와 같은 결 — 로그만).
        if (sub.includes("경제") && lacksInterpretation(article.body_html)) {
          try {
            const retried = await generateArticle({ ...genInput, variantInstruction: "★경고: 직전 생성이 제도·수치 나열에 그쳤다. 정보 문단마다 '그래서 독자에게 뭐가 달라지는지' 해석 문단을 짝으로 붙이고, 소득·가구·조건별로 답이 갈리는 지점을 본문 중심에 둬라(수익형 분야 지침의 해석 짝 의무). 분량 1,800~2,200자(공백 제외)는 유지." });
            const cr = retried.body_html.replace(/<[^>]+>/g, "").replace(/\s+/g, "").length;
            if (cr >= 500 && !lacksInterpretation(retried.body_html)) article = retried;
          } catch { /* 재생성 실패 — 원본 그대로 */ }
          if (lacksInterpretation(article.body_html)) console.log(`[wp-auto][interpretation] blog=${b.id} — 해석 신호 바닥 미달, 통과(로그만)`);
        }
        // ★내 조건 분기 게이트(2026-07-29 전략 회의 — AI 브리핑 인용 2,900회 대비 방문 미증가 실측).
        //  '내 조건이면 얼마인가'(조건 분기표 또는 숫자 계산 예시)가 없으면 브리핑이 답을 종결시켜 인용만 남는다.
        if (lacksConditionBranch(article.body_html)) {
          try {
            const retried = await generateArticle({ ...genInput, variantInstruction: "★경고: 직전 생성에 '내 조건이면 얼마인가'가 없다. AI 요약이 그대로 종결시켜 클릭이 남지 않는 글이다. 둘 중 최소 하나를 반드시 넣어라 — ①조건 분기표(소득·연령·가입기간처럼 답이 갈리는 축을 세로로, 그 조건일 때의 실제 금액·비율을 칸에 채운 표, 머리행 포함 3행 이상) ②숫자 계산 예시('예를 들어 총급여 4,500만 원이면…' 가정값→계산 과정→결과 숫자, 가정임을 명시). 분량 1,800~2,200자(공백 제외)는 유지." });
            const cr = retried.body_html.replace(/<[^>]+>/g, "").replace(/\s+/g, "").length;
            if (cr >= 500 && !lacksConditionBranch(retried.body_html)) article = retried;
          } catch { /* 재생성 실패 — 원본 그대로 */ }
          if (lacksConditionBranch(article.body_html)) console.log(`[wp-auto][condition-branch] blog=${b.id} — 조건 분기 없음, 통과(로그만)`);
        }
        // ★제목 뼈대 수렴 게이트(2026-08-01 유저 실측: 31편 중 7편이 '~ 전 확인할 N가지').
        //  프롬프트 로테이션이 돌아도 한 형식 안에서 예시 뼈대를 베껴 획일화된다.
        //  구글이 대량 생산 신호로 읽는 영역이라(애드센스 채널) 코드로 막는다.
        if (isOverusedTitleShape(article.title)) {
          try {
            const retried = await generateArticle({ ...genInput, variantInstruction: `★경고: 직전 제목 "${article.title}"은 이 블로그가 이미 과다 사용한 뼈대다('~ 전 확인할 N가지' 류). 완전히 다른 문형으로 다시 지어라 — 검색자가 실제로 칠 질문 그대로 쓰거나, 글의 결론을 제목에 박거나, 구체 숫자를 문장 안 자연스러운 자리에 넣는다. 본문 내용·분량은 유지.` });
            const cr = retried.body_html.replace(/<[^>]+>/g, "").replace(/\s+/g, "").length;
            if (cr >= 500 && !isOverusedTitleShape(retried.title)) article = retried;
          } catch { /* 재생성 실패 — 원본 그대로 */ }
          if (isOverusedTitleShape(article.title)) console.log(`[wp-auto][title-shape] blog=${b.id} — 과다 뼈대 잔존: ${article.title}`);
        }
        // ★필수 항목 누락 게이트(2026-08-01 유저 실측: "이건 고쳐서 나와야 해요").
        //  프롬프트로 미리 쥐여줘도 모델이 빠뜨린다. 빠진 이름을 그대로 박아 한 번 다시 쓴다.
        //  ★검사 결과가 줄어든 경우에만 교체(더 나빠진 재생성은 버린다). 생성 라우트와 같은 규격.
        {
          const missBefore = article.fact_issues.filter((f) => f.layer === "missing");
          if (missBefore.length > 0) {
            const names = missBefore.map((f) => f.matched).join(", ");
            try {
              const retried = await generateArticle({ ...genInput, variantInstruction: `★경고: 직전 생성에서 이 주제의 필수 항목이 빠졌다 — ${names}. 독자가 모르면 손해를 보는 항목이라 빠지면 글이 성립하지 않는다. 각 항목을 이름만 스치지 말고 최소 한 단락 또는 표의 한 행으로 실제로 다뤄라(이 글 주제와 정말 무관하면 억지로 넣지 말고 나머지를 반드시 채운다). 분량 1,800~2,200자(공백 제외)는 유지.` });
              const cr = retried.body_html.replace(/<[^>]+>/g, "").replace(/\s+/g, "").length;
              if (cr >= 500 && retried.fact_issues.filter((f) => f.layer === "missing").length < missBefore.length) article = retried;
            } catch { /* 재생성 실패 — 원본 그대로 */ }
            const left = article.fact_issues.filter((f) => f.layer === "missing");
            if (left.length) console.log(`[wp-auto][missing-musts] blog=${b.id} — ${left.map((f) => f.matched).join(",")} 남음`);
          }
        }
        // ★사실 검사 게이트(2026-07-31 — 자사 사이트 실측 오류 2건이 원점: 예금자보호 옛 한도, 퇴직소득을 종합소득세로).
        //  구조 오류는 문장이 자연스러워서 사람이 안 보면 그대로 나간다. 위 게이트들과 달리 '로그만'으로 통과시키지 않는다.
        //  ★단 글을 버리지는 않는다 — 재생성 1회 후에도 남으면 자동발행만 막고 승인탭(draft)으로 내린다.
        //   검토 화면의 사실 검사 패널이 무엇을 고쳐야 하는지 그대로 보여주므로, 사람 눈으로 갈 수 있으면 보내는 게 낫다.
        let holdReason = "";
        if (factVerdict(article.fact_issues) === "rewrite") {
          const wrong = article.fact_issues.filter((f) => f.layer === "structure" && f.severity === "block");
          try {
            const retried = await generateArticle({
              ...genInput,
              variantInstruction: `★경고: 직전 생성이 제도를 잘못 설명했다. 아래를 반드시 바로잡아라(해당 문단은 통째로 다시 쓴다).\n${wrong.map((f) => `- ${f.title} → ${f.fix}`).join("\n")}`,
            });
            const cr = retried.body_html.replace(/<[^>]+>/g, "").replace(/\s+/g, "").length;
            if (cr >= 500 && factVerdict(retried.fact_issues) !== "rewrite") article = retried;
          } catch { /* 재생성 실패 — 원본 그대로 두고 아래에서 보류 판정 */ }
          const left = article.fact_issues.filter((f) => f.layer === "structure" && f.severity === "block");
          if (left.length) {
            holdReason = left.map((f) => f.title).join(" / ");
            console.log(`[wp-auto][fact] blog=${b.id} — 자동발행 보류, 승인탭으로: ${holdReason}`);
          }
        }
        // ★광고표현 검문(2026-07-31) — scanCompliance가 검토 화면(UI)에만 붙어 있어 자동발행 경로는 무검문이었다.
        //  게이트를 사람이 보는 화면에 두면, 사람이 안 보는 경로는 그냥 통과한다(팩트 게이트와 똑같은 패턴의 구멍).
        //  high(거의 확실한 위반)만 자동발행을 막는다 — medium은 맥락에 따라 갈리므로 승인탭에서 사람이 판단한다.
        //  재생성하지 않는 이유: 검토 화면에 '바꾸기' 버튼(대체 표현 1클릭 치환)이 이미 있어 사람 손이 더 싸고 정확하다.
        {
          const high = scanCompliance(`${article.title}\n${article.body_html}`, "online").filter((v) => v.severity === "high");
          if (high.length) {
            const label = high.map((v) => `‘${v.matched}’`).join(" ");
            holdReason = holdReason ? `${holdReason} / ${label}` : label;
            console.log(`[wp-auto][compliance] blog=${b.id} — 자동발행 보류, 승인탭으로: ${label}`);
          }
        }
        // WP 후처리 — 네이버 포맷터(스페이서·형광펜) 미적용. 마커만 정리.
        let body = stripNaverArtifacts(article.body_html); // 해시태그·마커 일괄 소거(중앙 소거기)
        // ★함께 보면 좋은 글 — 네이버 보조 링크(2026-07-20, 마스터 지침 [7]⑧: WP 우선은 본문 내부링크가, 네이버는 보조로만).
        //  수동 발행 경로에만 있던 WP→네이버 링크를 자동발행에도 — 핏 강한 것만 최대 2개, 없으면 섹션 자체 생략.
        try {
          const { data: nvs } = await db.from("articles").select("keyword, title, naver_url").eq("user_id", b.user_id).in("status", ["verified", "published"]).not("naver_url", "is", null).order("created_at", { ascending: false }).limit(30);
          const toks = (t: string) => new Set(String(t).split(/[\s,·:]+/).map((x) => x.replace(/[^가-힣a-zA-Z0-9]/g, "")).filter((x) => x.length >= 3));
          const kt = toks(`${pick.keyword} ${article.title ?? ""}`);
          const fit = (o: { keyword?: string | null; title?: string | null }) => { let s = 0; for (const t of toks(`${o.keyword ?? ""} ${o.title ?? ""}`)) if (kt.has(t)) s++; return s; };
          const best = (nvs ?? []).map((o) => ({ o, s: fit(o) })).filter((x) => x.s >= 1 && x.o.naver_url).sort((a, b2) => b2.s - a.s).slice(0, 2);
          if (best.length) {
            const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
            body += `<h2>함께 보면 좋은 글</h2><ul>${best.map((x) => `<li><a href="${x.o.naver_url}" target="_blank" rel="noopener">${esc(String(x.o.title ?? x.o.keyword))}</a></li>`).join("")}</ul>`;
          }
        } catch { /* 무해 — 링크 없이 발행 */ }
        // ★배너를 초안 단계에 삽입(2026-07-12 유저: 읽어보기에 이미지가 안 보임 — 승인은 최종 모습으로) — 스토리지 URL이라 DB 비대 없음
        try { body = insertBanners(body, await generateWpBannersToStorage(b.user_id, pick.keyword, `${b.id}-${kstDay()}-${crypto.randomUUID().slice(0, 8)}`, 3, String((b as { blog_name?: string | null }).blog_name ?? "")), pick.keyword); } catch { /* 배너 실패 — 계속 */ }
        const ins = {
          user_id: b.user_id, blog_id: b.id, keyword: pick.keyword, title: article.title,
          meta_title: article.meta_title, meta_description: article.meta_description,
          body_html: body, original_html: body, faq: article.faq, tags: article.tags ?? [],
          char_count: body.replace(/<[^>]+>/g, "").length, article_type: "info", channel: "wordpress",
          status: "draft",
        } as Record<string, unknown>;
        const { data: saved, error } = await db.from("articles").insert(ins).select("id, title, body_html, meta_title, meta_description, faq, tags, keyword").single();
        if (error || !saved) throw new Error(error?.message ?? "insert fail");

        if (b.auto_publish === "daily" && !holdReason) {
          const dailyHtml = saved.body_html as string; // 배너는 위에서 이미 삽입됨
          const r = await publishPost({
            siteUrl: conn.site_url, username: conn.username, appPassword: decryptSecret(conn.app_password),
            title: saved.title, contentHtml: dailyHtml,
            metaDescription: saved.meta_description ?? undefined, metaTitle: saved.meta_title ?? undefined,
            faq: Array.isArray(saved.faq) ? saved.faq : undefined,
            tags: Array.isArray(saved.tags) ? (saved.tags as string[]) : undefined,
            featuredImage: await autoFeaturedImage(b.user_id, String(saved.keyword ?? pick.keyword), String((b as { blog_name?: string | null }).blog_name ?? ""), String(saved.id), { title: saved.title, bgUrl: (() => { const all = [...dailyHtml.matchAll(/class="ateflo-banner"[^>]*>\s*<img[^>]+src="([^"]+)"/g)].map((m) => m[1]!); if (!all.length) return null; let h = 0; for (const ch of String(saved.id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return all[h % all.length]!; })() }) ?? undefined, // ★대표 이미지 v2
            categoryName: wpCategoryFor(String(saved.keyword ?? pick.keyword), saved.title), // ★카테고리 자동
            addToc: true, ymyl: false, status: "publish",
          });
          await db.from("articles").update({ status: "published", wp_post_id: r.id, wp_link: r.link, publish_at: new Date().toISOString() }).eq("id", saved.id);
          results.push({ blog: b.id, result: "published" });
        } else {
          results.push({ blog: b.id, result: holdReason ? `hold:${holdReason.slice(0, 60)}` : "review_ready" }); // 아침 승인탭 대기(draft)
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
