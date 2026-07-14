import { NextResponse } from "next/server";
import { FF } from "@/config/featureFlags";
import { fetchTopPosts } from "@/lib/naverBlogSearch";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { ensureUserRow } from "@/lib/userPlan";
import { spendCredits, addCredits, GENERATE_COST } from "@/lib/credits";
import { streamArticle } from "@/lib/generateArticle";
import { isReviewType, ensureDisclosure } from "@/lib/revenue";
import { hasFabricatedExperience } from "@/lib/editorial";
import { sanitizeUrls } from "@/lib/linkWhitelist";
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
import { newsContextFor } from "@/lib/newsTopics";
import { isTimeSensitive } from "@/lib/timeSensitive";
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
    newsContext?: string; // ★오늘 이슈 — 최신 뉴스 발췌(근거 자료)
    angleBrief?: string; // ★C단계 앵글 브리프(무중복 증식)
    selectionMeta?: Record<string, unknown>; // ★성과 루프(FF_PERF_LOOP) — 선별 맥락(발행 스냅샷용)
    seriesId?: string; // ★시리즈 2화+ — user_series 진행
    series?: { title?: string; arc?: { role?: string; angle?: string }[] } | null; // ★시리즈 1화 — 아크 생성
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
    .select("id,channel,naver_blog_id,vertical,sub_category,biz_name,biz_address,biz_detail_address,biz_phone,biz_hours,biz_hours_json,biz_strength,audience,my_angle")
    .eq("user_id", user.id).eq("is_active", true)
    .maybeSingle();
  const vertical = profileRow?.vertical ?? "general";
  // ★멀티 블로그 시드 — 문체 페르소나·구조·앵글이 블로그별로 갈린다(같은 계정의 블로그끼리도 다른 지문)
  const seedId = (profileRow as { id?: string } | null)?.id ?? user.id;
  // tone/type은 '명시적으로 보낸 값 우선', 없을 때만 업종 기본값 폴백(general은 매핑 없음=현행 howto/friendly).
  const vDef = VERTICAL_DEFAULTS[vertical];
  const type = body.type ?? vDef?.type ?? "howto";
  const tone = body.tone ?? vDef?.tone ?? "friendly";
  // 네이버 수익형 단일 — 업장 개념이 없어 정보성 기본(명시적으로 보내면 존중: 레거시 업장 프로필용).
  const promo = body.promo ?? false;
  // ★리뷰/제휴형 판정(대가성 문구·링크 자리) — 판정은 lib/revenue 한 곳. 브리프 의도도 반영.
  const briefIntent = typeof body.angleBrief === "string" ? (/의도:\s*([^\n]+)/.exec(body.angleBrief)?.[1] ?? null) : null;
  const isReview = isReviewType({ keyword: body.keyword, title: body.angle, intent: briefIntent, promo });
  const channel = (((profileRow as { channel?: string } | null)?.channel === "wordpress") ? "wordpress" : "naver") as "naver" | "wordpress"; // ★채널 = 활성 블로그 속성(0059). 네이버 블로그는 기존과 동일

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
  const variant = pickVariant(usedSignatures, `${seedId}:${keywordNorm}:${usedSignatures.length}`);
  // 관점 축(유저+키워드 시드) — 구조×관점 조합으로 같은 키워드도 유저마다 다른 글(중복 방지)
  const angle = pickAngle(`${seedId}:${keywordNorm}`);
  const variantInstruction = `${variant.instruction} ${angle}`;
  // ★계정별 스타일 페르소나 — 같은 계정은 항상 같은 스타일, 계정 간은 다름(대량 발행 지문 방지). 유저 프롬프트 주입이라 캐싱 무영향.
  // ★낡은 연도 교정 — 어떤 경로로든 '2024 최신 ○○' 각도가 들어오면 현재 연도로 치환(마지막 방어선)
  const CUR_YEAR = String(new Date(Date.now() + 9 * 3600_000).getFullYear());
  if (typeof body.angle === "string") body.angle = body.angle.replace(/20(1[0-9]|2[0-5])/g, CUR_YEAR);

  const styleInstruction = stylePersonaInstruction(seedId);
  // ★최신화 안전망 — 이슈 글감이 아니어도 그 키워드의 오늘 뉴스를 근거로 주입(모델 기억의 '2024 최신' 사고 방지).
  //  단, 뉴스 API 호출은 '시점 민감 글'에만(웹검색 게이트와 동일 기준) — 여행·레시피 등은 쿼터 낭비라 생략.
  const timeSensitiveGen = isTimeSensitive({ keyword, angle: body.angle, vertical, newsContext: body.newsContext });
  // ★수치 민감(실측: 꾸준 수요 글의 금리표가 낡음) — 금리·대출·지원금류는 풀 글감이어도 최신 뉴스 발췌를 근거로 주입
  const numericSensitive = /금리|대출|지원금|보조금|세금|환급|연금|보험료|요금|수수료|한도|공제|청약|재난지원/.test(keyword);
  const resolvedNewsContext: string | null =
    typeof body.newsContext === "string" && body.newsContext.trim()
      ? body.newsContext.slice(0, 1600)
      : (timeSensitiveGen || numericSensitive)
        ? await newsContextFor(keyword).then((v) => (v ? v.slice(0, 1600) : null)).catch(() => null)
        : null;
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
        // ★시리즈(수익 증폭) — 1화: series(title+arc) 수신 → user_series 생성. 2화+: seriesId 수신 → 화 진행.
        //  멀티 블로그(Stage 5): user_id → blog_id 전환 지점.
        let seriesId: string | null = null;
        let episodeIndex: number | null = null;
        let seriesDirective = "";
        let prevUrl: string | null = null;
        let prevTitle: string | null = null;
        try {
          if (body.seriesId && typeof body.seriesId === "string") {
            const { data: sr } = await supabase.from("user_series").select("*").eq("id", body.seriesId).eq("user_id", user.id).eq("status", "active").maybeSingle();
            if (sr) {
              seriesId = sr.id; episodeIndex = sr.next_ep;
              const arc = (sr.arc as { role: string; angle: string }[]) ?? [];
              const ep = arc[sr.next_ep - 1];
              seriesDirective = `\n[시리즈] "${sr.title}" ${sr.next_ep}화/${sr.total} — 이 화의 역할: ${ep?.role ?? ""} (${ep?.angle ?? ""}). 이 화만 읽어도 완결되게 쓰되, 도입 직후 전편을 잇는 한 줄과 함께 [전편 링크 자리] 마커를 한 번 넣는다.`;
              // 전편 — verified면 URL 자동 삽입(RSS 검증 배포로 활성화), 아니면 마커+위저드 안내 폴백
              const { data: prev } = await supabase.from("articles").select("title, status, naver_url").eq("series_id", sr.id).eq("episode_index", sr.next_ep - 1).eq("user_id", user.id).maybeSingle();
              if (prev && (prev.status === "verified") && prev.naver_url) { prevUrl = prev.naver_url; prevTitle = prev.title; }
              const done = sr.next_ep >= sr.total;
              await supabase.from("user_series").update({ next_ep: sr.next_ep + 1, status: done ? "done" : "active" }).eq("id", sr.id);
            }
          } else if (body.series && typeof body.series === "object" && body.series.title && Array.isArray(body.series.arc) && body.series.arc.length >= 3) {
            const arc = (body.series.arc as { role?: string; angle?: string }[]).map((e) => ({ role: String(e.role ?? "").slice(0, 40), angle: String(e.angle ?? "").slice(0, 90) })).filter((e) => e.role && e.angle).slice(0, 4);
            if (arc.length >= 3) {
              const { data: ins } = await supabase.from("user_series").insert({ user_id: user.id, blog_id: (profileRow as { id?: string } | null)?.id ?? null, keyword, title: String(body.series.title).slice(0, 60), arc, total: arc.length, next_ep: 2 }).select("id").single();
              if (ins) { seriesId = ins.id; episodeIndex = 1; seriesDirective = `\n[시리즈] "${String(body.series.title).slice(0, 60)}" 1화/${arc.length} — 이 화의 역할: ${arc[0].role} (${arc[0].angle}). 이 화만 읽어도 완결되게.`; }
            }
          }
        } catch { /* 시리즈 실패 = 단발로 자연 폴백(테이블 미적용 포함) */ }

        // ★내부링크(허브 앤 스포크) — 같은 블로그의 확정 URL 글 중 키워드 토큰 겹침 상위 2개
        let relatedPosts: { title: string; url: string }[] = [];
        try {
          const blogIdForLink = (profileRow as { id?: string } | null)?.id ?? null;
          let rq = supabase.from("articles").select("keyword, title, naver_url, created_at").eq("user_id", user.id).in("status", ["verified", "published"]).not("naver_url", "is", null).order("created_at", { ascending: false }).limit(30);
          if (blogIdForLink) rq = rq.or(`blog_id.eq.${blogIdForLink},blog_id.is.null`);
          const { data: cands } = await rq;
          // ★유저 실측 반영(ETF 글에 부동산 청약 추천): ①기간제(청약·마감형) 글 제외 — 접수가 끝나면 죽은 링크 ②범용 단어 겹침 배제 — 실질 주제 토큰만
          const STOP = new Set(["방법", "정리", "총정리", "조건", "신청", "기간", "확인", "이유", "비교", "기준", "주의", "사항", "완벽", "가이드", "하는", "해야", "알아야", "지금", "오늘", "관련", "대상", "혜택", "지원", "제도", "종류", "순서", "발급"]);
          const TIMED = /(무순위|청약|공고|마감|접수|모집|선착순|추첨)/; // 행동 창이 닫히면 수명이 끝나는 글
          // ★어미 조각 배제(2026-07-13 실측: 정책대출 글↔임산부 지원금 — '신청하는'·'순서대로' 같은 4자 동사 조각이 '강한 명사'로 오인돼 통과)
          const VERBAL = /(하는|되는|받는|하기|해요|대로|까지|부터|위한|없이|좋은|바뀐|놓친)$/;
          const tok = (t: string) => new Set(String(t).split(/[\s·,]+/).map((x) => x.replace(/[^가-힣a-zA-Z0-9]/g, "")).filter((x) => x.length >= 2 && !STOP.has(x) && !VERBAL.test(x)));
          // ★키워드끼리만 대조(제목·앵글은 어미 조각 유입원) — 키워드는 명사구라 깨끗하다
          const myTok = tok(keyword);
          // ★완전 핏만(2026-07-13 유저 확정: 애매하면 아예 생략 — 글은 쌓이니 핏이 생기면 그때) —
          //  키워드 토큰 2개+ 겹침, 또는 4자+ 강한 주제 명사(연금저축·세액공제급) 1개 겹침만 인정
          const strongFit = (c: { keyword?: string | null; title?: string | null }) => {
            const shared = [...tok(String(c.keyword ?? ""))].filter((t) => myTok.has(t));
            return { score: shared.length, strong: shared.length >= 2 || shared.some((t) => t.length >= 4) };
          };
          relatedPosts = (cands ?? [])
            .filter((c) => !TIMED.test(`${c.keyword ?? ""} ${c.title ?? ""}`))
            .map((c) => { const f = strongFit(c); return { title: String(c.title ?? ""), url: String(c.naver_url ?? ""), score: f.score, strong: f.strong }; })
            .filter((c) => c.url && c.strong)
            .sort((a, b) => b.score - a.score)
            .slice(0, 2)
            .map(({ title, url }) => ({ title, url }));
          // ★네이버→WP 크로스 링크 제거(2026-07-14 유저 확정) — 네이버는 외부 상업성 링크에 민감, 돼지통(자산)이 pigtong(신생)보다 잃을 게 크다.
          //  WP→네이버 방향(wordpress/publish)은 유지. 재개 조건: 돼지통 체급 안정 후 — 그때도 링크 대신 '무링크 언급' 방식 우선 검토.
        } catch { /* 무해 — 링크 없이 진행 */ }
        // ★SERP 역분석(상위노출 직접 전술) — 상위 5글 제목·요약을 능가 브리프로(실패 시 빈 배열, 기존 품질 유지)
        const topPosts = channel === "wordpress" ? [] : await fetchTopPosts(keyword, 5).catch(() => []);
        const fmtAge = (pd?: string) => {
          if (!pd || !/^\d{8}$/.test(pd)) return "";
          const months = Math.floor((Date.now() - new Date(`${pd.slice(0, 4)}-${pd.slice(4, 6)}-${pd.slice(6, 8)}`).getTime()) / (30 * 86400_000));
          return months >= 1 ? ` (${months}개월 전 글)` : " (최근 글)";
        };
        const ages = topPosts.map((t) => (t as { postdate?: string }).postdate).filter((p2): p2 is string => Boolean(p2 && /^\d{8}$/.test(p2)))
          .map((p2) => (Date.now() - new Date(`${p2.slice(0, 4)}-${p2.slice(4, 6)}-${p2.slice(6, 8)}`).getTime()) / (30 * 86400_000));
        const staleSerp = ages.length >= 3 && ages.filter((a) => a >= 8).length >= Math.ceil(ages.length * 0.6); // 상위 글 60%+가 8개월+ = 오래된 판
        const serpContext = topPosts.length
          ? topPosts.map((t, i) => `${i + 1}. ${t.title}${fmtAge((t as { postdate?: string }).postdate)} — ${t.description.slice(0, 90)}`).join("\n")
            + (staleSerp ? "\n★기회 — 오래된 판: 상위 글 대부분이 8개월 이상 지난 글이다. 네이버는 최신 글을 끌어올리는 경향이 있어 새 블로그도 비집고 들어갈 수 있는 판 — 제목·도입에 2026년 최신 기준임을 명시하고, 오래된 글들이 못 담은 최신 변경사항을 앞세워라." : "")
          : null;
        // ★유저 고유 관점 블록(FF_SEED_CLAIM §5-2) — 온보딩/설정 한 줄(my_angle)을 본문에 자연스럽게(없으면 생략, 발행 비차단)
        const myAngle = FF.seedClaim ? String((profileRow as { my_angle?: string | null } | null)?.my_angle ?? "").trim().slice(0, 120) : "";
        const angleAddon = myAngle ? `\n[유저 고유 관점] 운영자가 밝힌 한 줄: "${myAngle}" — 본문 중간에 이 관점·상황이 자연스럽게 묻어나는 문단 1개를 넣어라(광고 아님, 없는 경험 지어내기 금지, 이 한 줄의 범위 안에서만).` : "";
        // ★씨앗 클레임(FF_SEED_CLAIM §5-1) — 트렌드 씨앗 글감만(뉴스 맥락 보유), 실패해도 생성은 계속
        if (FF.seedClaim && body.newsContext) {
          try {
            await adminDb.from("seed_claims").upsert({ category: profileRow?.sub_category || vertical, keyword_norm: keyword.replace(/\s+/g, ""), user_id: user.id }, { onConflict: "keyword_norm,user_id" });
          } catch { /* 0063 미적용/실패 — 무시 */ }
        }
        const genInput = { keyword, channel, serpContext, relatedPosts, angle: body.angle, type, tone, maxWords, variantInstruction, styleInstruction, relatedQueries, newsContext: resolvedNewsContext, angleBrief: ((typeof body.angleBrief === "string" ? body.angleBrief.slice(0, 900) : "") + seriesDirective + angleAddon).trim() || null, affiliate: isReview, vertical, bizName: promo ? profileRow?.biz_name : null, bizStrength: promo ? profileRow?.biz_strength : null, userStory: userStory || null, userTitle };
        let article = await streamArticle(
          genInput,
          (bodyHtml) => send({ type: "body", html: bodyHtml }),
          (title) => send({ type: "title", title }),
          (u) => { void logUsage({ userId: user.id, model: u.model, kind: "generate", inputTokens: u.inputTokens, outputTokens: u.outputTokens }); },
        );
        // ★경험 조작 가드 — '제가 써보니' 류 검출 시 재생성 1회(경고 주입), 재검출은 아래 실패 흐름으로.
        if (!userStory && hasFabricatedExperience(article.body_html)) {
          void logUsage({ userId: user.id, model: "guard", kind: "fabricated_retry", inputTokens: 0, outputTokens: 0 });
          article = await streamArticle(
            { ...genInput, variantInstruction: `${genInput.variantInstruction ?? ""} ★경고: 직전 생성에서 '제가 써보니/직접 해보니' 같은 지어낸 개인 경험 서술이 검출됐다. 이번엔 절대 금지 — 판단은 조건 비교의 분석 판단('조건만 보면 A가 유리해요')으로만.`.trim() },
            (bodyHtml) => send({ type: "body", html: bodyHtml }),
            (title) => send({ type: "title", title }),
            (u) => { void logUsage({ userId: user.id, model: u.model, kind: "generate", inputTokens: u.inputTokens, outputTokens: u.outputTokens }); },
          );
          if (hasFabricatedExperience(article.body_html)) {
            if (genId) await supabase.from("articles").delete().eq("id", genId);
            await refundOnce();
            send({ type: "error", error: "글을 만드는 중 문제가 생겨 잠깐 멈췄어요. 다시 한 번 눌러 주세요. (크레딧은 차감되지 않아요)" });
            return;
          }
        }

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
        const urlClean = sanitizeUrls(ensureDisclosure(article.body_html, isReview), { allowNaverBlogId: (profileRow as { naver_blog_id?: string | null } | null)?.naver_blog_id }); // ★URL 정화 — 내 블로그 전편 링크는 통과
        if (urlClean.replaced > 0) console.log(`[url-sanitize] user=${user.id.slice(0, 8)} replaced=${urlClean.replaced} fabricated=${JSON.stringify(urlClean.fabricated)}`);
        let finalBody = urlClean.html;
        if (prevUrl) { // ★전편 링크 자동 삽입(verified만) — 마커를 실제 링크로. 미충족 시 마커 유지(위저드 안내 폴백)
          finalBody = finalBody.includes("[전편 링크 자리]")
            ? finalBody.replace("[전편 링크 자리]", `<a href="${prevUrl}">${(prevTitle ?? "전편 글").replace(/</g, "")}</a>`)
            : finalBody;
        }

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
          ...(FF.perfLoop && body.selectionMeta && typeof body.selectionMeta === "object" && JSON.stringify(body.selectionMeta).length <= 4000 ? { selection_meta: body.selectionMeta } : {}), // ★성과 루프 — 선별 맥락(4KB 캡 초과 시 통째 생략 — 잘라서 JSON 깨뜨리지 않는다, 0062)
          original_html: finalBody, // 원본 복구용 (박스 포함 = 처음 받은 상태)
          status: "draft",
          write_note: article.write_note || null, // 글쓴이용 메모 (마이그레이션 0007)
          tags: article.tags ?? [], // 워드프레스 태그 (마이그레이션: articles.tags jsonb)
          article_type: promo ? "promo" : "info", // 홍보용/정보성 (마이그레이션 0040)
          series_id: seriesId, episode_index: episodeIndex, // 시리즈(0054) — 미적용 시 아래 재시도에서 제외
          blog_id: (profileRow as { id?: string } | null)?.id ?? null, // ★멀티 블로그 Phase A(0055) — 글의 블로그 소속
          channel, // 발행 채널 naver 고정 (마이그레이션 0042) — 컬럼 없으면 아래 재시도에서 제외
        };

        // 자리표시 행이 있으면 그 행을 채우고(UPDATE), 없으면 새로 INSERT
        const writeArticle = () =>
          genId
            ? supabase.from("articles").update(insertPayload).eq("id", genId).select("*").single()
            : supabase.from("articles").insert(insertPayload).select("*").single();

        let { data: saved, error: saveError } = await writeArticle();

        // 아직 없는 선택 컬럼(write_note·tags 등)을 가리키는 오류면 그 컬럼만 빼고 재시도 → 마이그레이션 전에도 생성은 항상 동작
        for (const col of ["tags", "write_note", "article_type", "channel", "series_id", "episode_index", "blog_id", "selection_meta"]) {
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
