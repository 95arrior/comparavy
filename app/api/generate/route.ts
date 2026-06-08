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

  // 한도 초과 처리: 프로는 차단. 무료는 결제 유도용 "미리보기(티저)"를 단 1개만 허용한다.
  // (모델 호출은 평소와 동일하게 1회 — 1글=1콜 불변식 유지, 추가 비용은 무료 1편 분량으로 제한)
  let teaser = false;
  if (row.articles_used >= row.articles_limit) {
    if (row.plan !== "free") {
      return NextResponse.json(
        { error: "이번 달 생성 한도를 모두 사용했습니다." },
        { status: 403 },
      );
    }
    const { count: lockedCount } = await supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("locked", true);
    // 영구 플래그(teaser_used) 또는 현존 잠금 글이 있으면 추가 티저 금지.
    // → 글이 30일 만료/삭제돼도 teaser_used가 남아 무한 무료생성을 막는다.
    if (row.teaser_used || (lockedCount ?? 0) > 0) {
      return NextResponse.json(
        { error: "무료 미리보기를 이미 만들었어요. 프로로 업그레이드하면 잠금이 풀리고 계속 생성할 수 있어요." },
        { status: 403 },
      );
    }
    teaser = true;
  }

  // 티저는 비용 최소화를 위해 무료 분량으로 생성한다 (모델 호출은 동일하게 1회).
  const maxWords = teaser ? PLANS.free.maxWords : PLANS[row.plan].maxWords;
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
          (title) => send({ type: "title", title }),
        );

        // 길이 검증 (목표 글자수의 절반 미만이면 너무 짧음)
        const charCount = countKoreanChars(article.body_html);
        if (charCount < maxWords * 0.5) {
          send({ type: "error", error: "생성된 글이 너무 짧습니다. 다시 시도해 주세요." });
          controller.close();
          return;
        }

        // 저장 + 사용량 증가
        const insertPayload: Record<string, unknown> = {
          user_id: user.id,
          keyword,
          title: article.title,
          meta_title: article.meta_title,
          meta_description: article.meta_description,
          body_html: article.body_html,
          faq: article.faq,
          char_count: charCount,
          simhash: simhash(article.body_html), // 근접 중복 모니터링용 (재생성 안 함)
          original_html: article.body_html, // AI 원본 복구용 (수정해도 보존)
          status: "draft",
          write_note: article.write_note || null, // 글쓴이용 메모 (마이그레이션 0007)
        };
        // 티저(잠금 미리보기)일 때만 locked 사용 → 마이그레이션(0006) 전에도 일반 생성은 정상 동작
        if (teaser) insertPayload.locked = true;

        let { data: saved, error: saveError } = await supabase
          .from("articles")
          .insert(insertPayload)
          .select("*")
          .single();

        // write_note 컬럼이 아직 없으면(마이그레이션 0007 전) 그 필드만 빼고 재시도 → 생성은 항상 동작
        if (saveError && /write_note/i.test(saveError.message ?? "")) {
          delete insertPayload.write_note;
          ({ data: saved, error: saveError } = await supabase
            .from("articles")
            .insert(insertPayload)
            .select("*")
            .single());
        }

        if (saveError) {
          // 진단용: 실제 DB 오류 메시지 표면화 (대부분 마이그레이션 미실행 = 컬럼 없음)
          send({ type: "error", error: `저장 실패: ${saveError.message ?? "알 수 없는 오류"}` });
          controller.close();
          return;
        }

        // 티저(미리보기)는 사용량을 올리지 않는다 (정식 글이 아니라 결제 유도용 잠금 글).
        if (!teaser) {
          await supabase
            .from("users")
            .update({ articles_used: usedSoFar + 1 })
            .eq("id", user.id);
        } else {
          // 티저를 만들었음을 영구 기록 → 글이 삭제·만료돼도 재생성 차단 (컬럼 없으면 무시됨)
          await supabase.from("users").update({ teaser_used: true }).eq("id", user.id);
        }

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
