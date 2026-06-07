import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { ensureUserRow, rolloverIfNeeded } from "@/lib/userPlan";
import { PLANS } from "@/lib/plans";
import { streamArticle } from "@/lib/generateArticle";
import { countKoreanChars } from "@/lib/humanizer";
import { isDisposableEmail } from "@/lib/disposableEmail";
import { checkRateLimit } from "@/lib/rateLimit";
import { normalizeKeyword, pickVariant, simhash } from "@/lib/diversity";

export const maxDuration = 300;

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 완료되지 않았습니다." }, { status: 500 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  // 어뷰징 방어 ① 일회용 이메일 차단 (대량 무료계정 방지)
  if (user.email && isDisposableEmail(user.email)) {
    return NextResponse.json(
      { error: "일회용 이메일 주소로는 이용할 수 없습니다. 사용 중인 이메일로 가입해 주세요." },
      { status: 403 },
    );
  }

  // 어뷰징 방어 ② 버스트 rate limit (5분당 5회) — 비용 급증·자동화 방지
  const rl = await checkRateLimit(supabase, user.id, "generate", 5, 300);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `요청이 너무 잦습니다. ${rl.retryAfterSec ?? 60}초 후 다시 시도해 주세요.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } },
    );
  }

  let body: {
    keyword?: string;
    angle?: string;
    type?: string;
    tone?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const keyword = (body.keyword ?? "").trim();
  if (!keyword) {
    return NextResponse.json({ error: "키워드를 입력해 주세요." }, { status: 400 });
  }

  // 플랜·사용량 확인
  let row = await ensureUserRow(supabase, user.id);
  row = await rolloverIfNeeded(supabase, row);

  if (row.articles_used >= row.articles_limit) {
    return NextResponse.json(
      { error: "이번 달 생성 한도를 모두 사용했습니다. 프로로 업그레이드하면 더 많이 생성할 수 있습니다." },
      { status: 403 },
    );
  }

  const maxWords = PLANS[row.plan].maxWords;
  const type = body.type ?? "howto";
  const tone = body.tone ?? "friendly";
  const usedSoFar = row.articles_used;

  // P1-C 다양성: 이미 쓴 구조를 피해 새 구조를 고른다 (생성 전, 모델 호출 0 추가).
  const keywordNorm = normalizeKeyword(keyword);
  const { data: usedRows } = await supabase
    .from("article_patterns")
    .select("signature")
    .eq("user_id", user.id)
    .eq("keyword_norm", keywordNorm);
  const usedSignatures = (usedRows ?? []).map((r: { signature: string }) => r.signature);
  const variant = pickVariant(usedSignatures, `${user.id}:${keywordNorm}:${usedSignatures.length}`);

  // SSE 스트리밍: 글이 써지는 과정을 실시간으로 흘려보낸다.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        const article = await streamArticle(
          { keyword, angle: body.angle, type, tone, maxWords, variantInstruction: variant.instruction },
          (bodyHtml) => send({ type: "body", html: bodyHtml }),
        );

        // 길이 검증 (목표 글자수의 절반 미만이면 너무 짧음)
        const charCount = countKoreanChars(article.body_html);
        if (charCount < maxWords * 0.5) {
          send({ type: "error", error: "생성된 글이 너무 짧습니다. 다시 시도해 주세요." });
          controller.close();
          return;
        }

        // 저장 + 사용량 증가
        const { data: saved, error: saveError } = await supabase
          .from("articles")
          .insert({
            user_id: user.id,
            keyword,
            title: article.title,
            meta_title: article.meta_title,
            meta_description: article.meta_description,
            body_html: article.body_html,
            faq: article.faq,
            char_count: charCount,
            simhash: simhash(article.body_html), // 근접 중복 모니터링용 (재생성 안 함)
            status: "draft",
          })
          .select("*")
          .single();

        if (saveError) {
          send({ type: "error", error: "글을 저장하지 못했습니다." });
          controller.close();
          return;
        }

        await supabase
          .from("users")
          .update({ articles_used: usedSoFar + 1 })
          .eq("id", user.id);

        // 다양성 원장 기록 → 다음 생성 때 이 구조를 피한다
        await supabase
          .from("article_patterns")
          .upsert(
            { user_id: user.id, keyword_norm: keywordNorm, signature: variant.key, last_used_at: new Date().toISOString() },
            { onConflict: "user_id,keyword_norm,signature" },
          );

        send({ type: "done", article: saved });
      } catch (err) {
        const message = err instanceof Error ? err.message : "글 생성 중 오류가 발생했습니다.";
        send({ type: "error", error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
