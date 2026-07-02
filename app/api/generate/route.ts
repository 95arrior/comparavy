import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { ensureUserRow } from "@/lib/userPlan";
import { spendCredits, addCredits, GENERATE_COST } from "@/lib/credits";
import { streamArticle } from "@/lib/generateArticle";
import { countKoreanChars } from "@/lib/humanizer";
import { isDisposableEmail } from "@/lib/disposableEmail";
import { checkRateLimit } from "@/lib/rateLimit";
import { normalizeKeyword, pickVariant, pickAngle, simhash } from "@/lib/diversity";
import { looksLikeGarbageKeyword, looksLikeNonsenseStory } from "@/lib/keywordGuard";
import { isUnsafeKeyword } from "@/lib/keywordSafety";
import { deriveStoryTopic, validateStoryMeaning } from "@/lib/aiSeeds";
import { explicitAudienceOf, AUDIENCE_ALL } from "@/lib/audience";
import { isAdminEmail } from "@/lib/adminStats";
import { logUsage } from "@/lib/usageLog";
import { recordAiResult } from "@/lib/aiHealth";
import { VERTICAL_DEFAULTS } from "@/lib/blogProfile";
import { stylePersonaInstruction } from "@/lib/stylePersona";
import { fetchNaverAutocomplete } from "@/lib/naverAutocomplete";

export const maxDuration = 300;

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 아직이에요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  // 출시 전 잠금: 관리자 외 생성 차단 (직접 호출로 비용 발생 방지)
  if (process.env.PRELAUNCH === "true" && !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "아직 오픈 전이에요. 사전 등록하면 가장 먼저 알려드릴게요." }, { status: 403 });
  }

  // 어뷰징 방어 ① 일회용 이메일 차단 (대량 무료계정 방지)
  if (user.email && isDisposableEmail(user.email)) {
    return NextResponse.json(
      { error: "일회용 이메일로는 이용하기 어려워요. 평소 쓰는 이메일로 가입해 주세요." },
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
    promo?: boolean; // true=홍보용(업장 연결) | false=정보성(순수 정보). 네이버 수익형 단일 후 기본 false
    userStory?: string; // '내 이야기' 재료
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청이 올바르지 않아요." }, { status: 400 });
  }

  const userStory = (body.userStory ?? "").trim().slice(0, 4000); // '내 이야기' 재료(상한)
  let keyword = (body.keyword ?? "").trim();
  const userTitle = userStory && keyword ? keyword.slice(0, 80) : null; // 사장님이 직접 쓴 제목(이야기+제목 둘 다일 때)
  // '내 이야기'인데 제목을 안 적으면, 이야기 첫 구절을 파이프라인 키워드로(실제 제목은 아래서 AI가 핏하게 유도).
  if (!keyword && userStory) keyword = userStory.replace(/\s+/g, " ").split(/[.!?\n]/)[0].trim().slice(0, 40);
  // 1차(규칙): 자모(ㅁㅇ)·숫자·기호·반복(aaaa)·자판난타(qwrt) 등 명백한 쓰레기 차단 — 헛 생성·비용 낭비 방지
  if (looksLikeGarbageKeyword(keyword)) {
    return NextResponse.json({ error: "검색할 만한 키워드를 입력해 주세요. (예: 강아지 분리불안)" }, { status: 400 });
  }
  // 2차(싼 모델): 'asdfqwer'·무작위 음절·의미 없는 문장 등 규칙을 통과한 무의미 입력 차단
  // (AI 의미판별 게이트 제거 — 추천 글감/실제 주제를 가끔 잘못 막던 false-positive 방지.
  //  난타·자모만 같은 명백한 쓰레기는 위 looksLikeGarbageKeyword(규칙)로 확정 차단.)
  // 타사 업체명·인물명·브랜드는 글감으로 금지(상표권·명예훼손·비교광고 위험)
  if (isUnsafeKeyword(keyword)) {
    return NextResponse.json({ error: "특정 업체명·브랜드는 글감으로 쓸 수 없어요. (상표권·명예훼손 위험) 일반 주제로 입력해 주세요." }, { status: 400 });
  }

  // ★'내 이야기'(userStory) — 생성 '전' 엄격 검증. 가비지/테스트면 비싼 생성 자체를 막아 비용·크레딧 0.
  //   (길이 검증은 생성 '후'라 이미 비용 발생 → 여기서 먼저 막는다.)
  if (userStory) {
    if (looksLikeNonsenseStory(userStory) || (userTitle && looksLikeGarbageKeyword(userTitle))) {
      return NextResponse.json({ error: "내용이 너무 짧거나 의미가 잘 안 통해요. 가게·수업·경험을 실제로 적어주세요." }, { status: 400 });
    }
    if (!(await validateStoryMeaning(userTitle ?? keyword, userStory))) {
      return NextResponse.json({ error: "테스트·아무 말처럼 보여 글을 만들 수 없어요. 실제 이야기를 적어주세요." }, { status: 400 });
    }
  }

  // 유저 행 보장(신규면 생성 — 크레딧 0으로 시작, 무료 크레딧 없음)
  await ensureUserRow(supabase, user.id, user.email);

  // 서비스롤(유저 RLS 우회가 필요한 카운터·RPC용)
  const adminDb = createSupabaseAdminClient();

  // ★크레딧 전환 — 플랜 한도·티저(무료 미리보기) 로직 제거.
  //   차감은 아래에서 '생성 시작 직전' 원자적 선차감(적자 방지: 크레딧 없으면 모델 호출 자체가 없음).
  const maxWords = 5000; // 엔진이 네이버 적정선(1,400~2,100자)으로 자체 캡 — 상한만 넉넉히
  // 업종(vertical) + 업체 정보 — 프로필에서 1회 조회(없으면 general/미입력). 프롬프트 분기 + 글 하단 NAP 박스에 사용.
  const { data: profileRow } = await supabase
    .from("blog_profiles")
    .select("vertical,sub_category,biz_name,biz_address,biz_detail_address,biz_phone,biz_hours,biz_hours_json,biz_strength,audience")
    .eq("user_id", user.id)
    .maybeSingle();
  const vertical = profileRow?.vertical ?? "general";
  // tone/type은 '명시적으로 보낸 값 우선', 없을 때만 업종 기본값 폴백(general은 매핑 없음=현행 howto/friendly).
  const vDef = VERTICAL_DEFAULTS[vertical];
  const type = body.type ?? vDef?.type ?? "howto";
  const tone = body.tone ?? vDef?.tone ?? "friendly";
  // 네이버 수익형 단일 — 업장 개념이 없어 정보성 기본(명시적으로 보내면 존중: 레거시 업장 프로필용).
  const promo = body.promo ?? false;
  const channel = "naver" as const; // 발행 채널 단일화 — 모든 글은 네이버 규격

  // 약한 audience 가드(버그2): 직접 입력해도 '설정한 대상과 명백히 동떨어진'(반대 연령어가 박힌) 글감만 막는다.
  // 명시적 연령어(성인/유아/초등/중고등)만 검사 → 도메인어(토익 등)·중립어는 통과(사장이 일부러 넣은 걸 과잉 차단 안 함).
  const audSel: string[] = Array.isArray(profileRow?.audience) ? (profileRow!.audience as string[]) : [];
  if (audSel.length > 0 && !audSel.includes(AUDIENCE_ALL)) {
    const ka = explicitAudienceOf(keyword);
    if (ka && !audSel.includes(ka)) {
      return NextResponse.json(
        { error: `이 글감은 설정하신 대상(${audSel.join("·")})과 거리가 있어 보여요. 프로필에서 가르치는 대상을 바꾸거나, 대상에 맞는 글감으로 다시 시도해 주세요.` },
        { status: 400 },
      );
    }
  }

  // P1-C 다양성: 이미 쓴 구조를 피해 새 구조를 고른다 (생성 전, 모델 호출 0 추가).
  const keywordNorm = normalizeKeyword(keyword);
  const { data: usedRows } = await supabase
    .from("article_patterns")
    .select("signature")
    .eq("user_id", user.id)
    .eq("keyword_norm", keywordNorm);
  const usedSignatures = (usedRows ?? []).map((r: { signature: string }) => r.signature);
  const variant = pickVariant(usedSignatures, `${user.id}:${keywordNorm}:${usedSignatures.length}`);
  // 관점 축(유저+키워드 시드) — 구조×관점 조합으로 같은 키워드도 유저마다 다른 글(중복 방지)
  const angle = pickAngle(`${user.id}:${keywordNorm}`);
  const variantInstruction = `${variant.instruction} ${angle}`;
  // ★계정별 스타일 페르소나 — 같은 계정은 항상 같은 스타일, 계정 간은 다름(대량 발행 지문 방지). 유저 프롬프트 주입이라 캐싱 무영향.
  const styleInstruction = stylePersonaInstruction(user.id);
  // ★네이버 자동완성 실데이터 — '관련 질문 점령'을 추측이 아니라 실제 함께 찾는 검색어로.
  //   긴 롱테일 문구는 자동완성이 비는 경우가 많아 '머리 키워드(앞 2어절)' 폴백. best-effort(2.5초 제한).
  const relatedQueries = await Promise.race([
    (async () => {
      let qs = await fetchNaverAutocomplete(keyword);
      if (qs.length === 0) {
        const head = keyword.split(/\s+/).slice(0, 2).join(" ");
        if (head && head !== keyword) qs = await fetchNaverAutocomplete(head);
      }
      return qs;
    })(),
    new Promise<string[]>((resolve) => setTimeout(() => resolve([]), 2500)),
  ]).then((qs) => qs.slice(0, 8)).catch(() => [] as string[]);

  // ★원자적 선차감 — 잔액 >= 1일 때만 차감 성공. 부족하면 모델 호출 없이 여기서 끝(적자 원천 차단).
  let creditBalance: number;
  try {
    const spent = await spendCredits(user.id, GENERATE_COST, "generate");
    if (spent === null) {
      return NextResponse.json(
        { error: "크레딧이 없어요. 크레딧을 충전하면 바로 이어서 쓸 수 있어요.", code: "NO_CREDITS" },
        { status: 402 },
      );
    }
    creditBalance = spent;
  } catch {
    return NextResponse.json({ error: "잠시 문제가 생겼어요. 다시 시도해 주세요." }, { status: 500 });
  }
  // 실패 시 환불용 참조 — (reason, ref) 멱등이라 어떤 경로로 두 번 불려도 1회만 환불됨
  const refundRef = globalThis.crypto.randomUUID();
  let refunded = false;
  const refundOnce = async () => {
    if (refunded) return;
    refunded = true;
    try {
      const b = await addCredits(user.id, GENERATE_COST, "refund_generate", refundRef);
      if (b !== null) creditBalance = b;
    } catch { /* 환불 실패는 원장에 남은 차감 기록으로 CS 복구 가능 */ }
  };

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
      let genId: string | null = null;
      try {
        // 생성 시작 즉시 '생성 중' 자리표시 행을 만든다 → 도중 새로고침·뒤로가기로 떠나도
        // 메인에서 '생성 중'을 보여주고, 완료되면 '보러가기'로 이어줄 수 있다.
        {
          const genInsert: Record<string, unknown> = {
            user_id: user.id,
            keyword,
            title: "글 생성 중…",
            body_html: "",
            char_count: 0,
            status: "generating",
          };
          const { data: ph } = await supabase.from("articles").insert(genInsert).select("id").single();
          genId = ph?.id ?? null;
          if (genId) send({ type: "generating", id: genId });
        }

        // '내 이야기'인데 제목을 안 적었으면, 이야기에서 AI로 핏한 검색 질문형 제목을 뽑아 앵커로 쓴다(제목 적었으면 그대로 존중).
        if (userStory && !userTitle) {
          const aud = audSel.filter((a) => a !== AUDIENCE_ALL).join("·") || undefined;
          const derived = await deriveStoryTopic(userStory, profileRow?.sub_category || vertical, aud);
          if (derived) keyword = derived;
        }
        const article = await streamArticle(
          { keyword, angle: body.angle, type, tone, maxWords, variantInstruction, styleInstruction, relatedQueries, newsContext: typeof body.newsContext === "string" ? body.newsContext.slice(0, 1600) : null, vertical, bizName: promo ? profileRow?.biz_name : null, bizStrength: promo ? profileRow?.biz_strength : null, userStory: userStory || null, userTitle },
          (bodyHtml) => send({ type: "body", html: bodyHtml }),
          (title) => send({ type: "title", title }),
          (u) => { void logUsage({ userId: user.id, model: u.model, kind: "generate", inputTokens: u.inputTokens, outputTokens: u.outputTokens }); },
        );

        // 길이 검증 — 네이버는 좁은 주제도 '네이버 최적화로 뽑을 수 있는 만큼' 살린다(1,000자 안팎도 충분).
        // 깊이 기준으로 반려하지 않고, '명백히 실패(빈/잘린)' 글만 막는 낮은 바닥(500자)만 둔다.
        const minChars = 500;
        const charCount = countKoreanChars(article.body_html);
        if (charCount < minChars) {
          if (genId) await supabase.from("articles").delete().eq("id", genId); // 자리표시 행 정리
          await refundOnce(); // 실패 = 크레딧 환불(멱등)
          send({
            type: "error",
            error: "글을 만드는 중 문제가 생겨 잠깐 멈췄어요. 다시 한 번 눌러 주세요. (크레딧은 차감되지 않아요)",
          });
          return;
        }

        // (네이버 수익형 단일 — 자영업 시절의 업체 NAP 박스 삽입 제거. 수익형 블로그에 영업장 정보는 무의미 + 전 글 공통 박스는 패턴 지문 리스크)
        const finalBody = article.body_html;

        // 저장 + 사용량 증가
        const insertPayload: Record<string, unknown> = {
          user_id: user.id,
          keyword,
          title: article.title,
          meta_title: article.meta_title,
          meta_description: article.meta_description,
          body_html: finalBody,
          faq: article.faq,
          char_count: charCount,
          simhash: simhash(article.body_html), // 근접 중복 모니터링용 (박스 제외 본문 기준, 재생성 안 함)
          original_html: finalBody, // 원본 복구용 (박스 포함 = 처음 받은 상태)
          status: "draft",
          write_note: article.write_note || null, // 글쓴이용 메모 (마이그레이션 0007)
          tags: article.tags ?? [], // 워드프레스 태그 (마이그레이션: articles.tags jsonb)
          article_type: promo ? "promo" : "info", // 홍보용/정보성 (마이그레이션 0040)
          channel, // 발행 채널 naver 고정 (마이그레이션 0042) — 컬럼 없으면 아래 재시도에서 제외
        };

        // 자리표시 행이 있으면 그 행을 채우고(UPDATE), 없으면 새로 INSERT
        const writeArticle = () =>
          genId
            ? supabase.from("articles").update(insertPayload).eq("id", genId).select("*").single()
            : supabase.from("articles").insert(insertPayload).select("*").single();

        let { data: saved, error: saveError } = await writeArticle();

        // 아직 없는 선택 컬럼(write_note·tags 등)을 가리키는 오류면 그 컬럼만 빼고 재시도 → 마이그레이션 전에도 생성은 항상 동작
        for (const col of ["tags", "write_note", "article_type", "channel"]) {
          if (saveError && new RegExp(col, "i").test(saveError.message ?? "")) {
            delete insertPayload[col];
            ({ data: saved, error: saveError } = await writeArticle());
          }
        }

        if (saveError) {
          if (genId) { try { await supabase.from("articles").delete().eq("id", genId); } catch {} }
          await refundOnce(); // 저장 실패 = 크레딧 환불(멱등)
          // 진단용: 실제 DB 오류 메시지 표면화 (대부분 마이그레이션 미실행 = 컬럼 없음)
          send({ type: "error", error: `저장 실패: ${saveError.message ?? "알 수 없는 오류"}` });
          return;
        }

        // (크레딧 전환 — 사용량 카운터·티저 기록 제거. 차감·환불은 credit_ledger가 단일 근거)

        // Stage 2-B: 이 키워드로 실제 글을 썼다 → 풀 분산 카운터 +1 (best-effort, 실패해도 생성 무관).
        // 풀에 없는 키워드(직접발굴 등)면 매칭 0건으로 자연히 무시된다.
        try {
          await adminDb.rpc("increment_keyword_assigned", { p_vertical: vertical, p_keyword: keyword });
        } catch {
          // 분산 카운터 실패는 글 생성에 영향 없음
        }

        // 다양성 원장 기록 → 다음 생성 때 이 구조를 피한다
        await supabase
          .from("article_patterns")
          .upsert(
            { user_id: user.id, keyword_norm: keywordNorm, signature: variant.key, last_used_at: new Date().toISOString() },
            { onConflict: "user_id,keyword_norm,signature" },
          );

        send({ type: "done", article: saved, credits: creditBalance });
        void recordAiResult(true);
      } catch (err) {
        if (genId) { try { await supabase.from("articles").delete().eq("id", genId); } catch {} }
        await refundOnce(); // 생성 중 예외 = 크레딧 환불(멱등)
        const message = err instanceof Error ? err.message : "글을 만드는 중 문제가 생겼어요. 다시 시도해 주세요.";
        void recordAiResult(false, message);
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
