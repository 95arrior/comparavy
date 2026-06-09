import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { ensureUserRow, rolloverIfNeeded } from "@/lib/userPlan";
import { PLANS } from "@/lib/plans";
import { streamArticle } from "@/lib/generateArticle";
import { countKoreanChars } from "@/lib/humanizer";
import { isDisposableEmail } from "@/lib/disposableEmail";
import { checkRateLimit } from "@/lib/rateLimit";
import { normalizeKeyword, pickVariant, simhash } from "@/lib/diversity";
import { looksLikeGarbageKeyword, isMeaningfulKeyword } from "@/lib/keywordGuard";

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
  // 1차(규칙): 자모(ㅁㅇ)·숫자·기호·반복(aaaa)·자판난타(qwrt) 등 명백한 쓰레기 차단 — 헛 생성·비용 낭비 방지
  if (looksLikeGarbageKeyword(keyword)) {
    return NextResponse.json({ error: "검색할 만한 키워드를 입력해 주세요. (예: 강아지 분리불안)" }, { status: 400 });
  }
  // 2차(싼 모델): 'asdfqwer'·무작위 음절·의미 없는 문장 등 규칙을 통과한 무의미 입력 차단
  if (!(await isMeaningfulKeyword(keyword))) {
    return NextResponse.json({ error: "글로 쓸 만한 주제를 입력해 주세요. (예: 강아지 분리불안 해결 방법)" }, { status: 400 });
  }

  // 플랜·사용량 확인
  let row = await ensureUserRow(supabase, user.id, user.email);
  row = await rolloverIfNeeded(supabase, row);

  // 증가/카운트는 서비스롤로 (유저 RLS로 막히던 문제 방지)
  const adminDb = createSupabaseAdminClient();
  // 무료(평생 한도)는 카운터에만 의존하지 않고 '실제 생성한 글 수'와 함께 큰 값을 써서 한도가 새지 않게 막는다.
  // (프로는 월마다 카운터가 리셋되므로 전체 글 수로 막으면 안 됨 → 카운터 그대로 사용)
  let used = row.articles_used ?? 0;
  if (row.plan === "free") {
    const { count: realUsed } = await adminDb
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("locked", false);
    used = Math.max(used, realUsed ?? 0);
  }

  // 한도 초과 처리: 프로는 차단. 무료는 결제 유도용 "미리보기(티저)"를 단 1개만 허용한다.
  // (모델 호출은 평소와 동일하게 1회 — 1글=1콜 불변식 유지, 추가 비용은 무료 1편 분량으로 제한)
  let teaser = false;
  if (used >= row.articles_limit) {
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

  // 티저(4번째 잠금 글)는 프로 품질(5000자)로 생성한다 — 결제해서 풀면 진짜 5000자 글을 얻어
  // "그럴 거면 결제하고 5000자짜리 했지" 후회를 없앤다. (티저는 이메일당 평생 1회라 비용 통제됨)
  const maxWords = teaser ? PLANS.pro.maxWords : PLANS[row.plan].maxWords;
  const type = body.type ?? "howto";
  const tone = body.tone ?? "friendly";

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
      // 클라이언트가 끊겨도(모바일 화면 off·백그라운드 탭) 생성·저장은 끝까지 진행되도록, 전송은 best-effort
      const send = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          // 수신 측이 끊김 — 무시하고 생성 계속
        }
      };
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
          return;
        }

        // 티저(미리보기)는 사용량을 올리지 않는다 (정식 글이 아니라 결제 유도용 잠금 글).
        // 증가는 서비스롤(adminDb)로 — 유저 권한(RLS) 때문에 카운터가 안 올라가던 버그 방지.
        if (!teaser) {
          await adminDb
            .from("users")
            .update({ articles_used: used + 1 })
            .eq("id", user.id);
        } else {
          // 티저를 만들었음을 영구 기록 → 글이 삭제·만료돼도 재생성 차단 (컬럼 없으면 에러는 무시)
          await adminDb.from("users").update({ teaser_used: true }).eq("id", user.id);
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
        try {
          controller.close();
        } catch {
          // 클라이언트가 이미 끊겼으면 무시 (생성·저장은 위에서 완료됨)
        }
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
