import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { logUsage } from "@/lib/usageLog";
import { checkRateLimit } from "@/lib/rateLimit";
import { isAdminEmail } from "@/lib/adminStats";
import { parseAnswerSheet, daysSeenIn } from "@/lib/answerSheet";
import { fetchBlogTotalDetailed } from "@/lib/naverBlogSearch";
import { isUnsafeKeyword, financeBrandAllowed } from "@/lib/keywordSafety";
import { DOC_HARD_MAX } from "@/lib/topicScore";

export const maxDuration = 60;

/**
 * ★아침 브리핑(답안지 레인 1단계, 2026-08-10) — docs/answer-sheet-lane.md
 * 크리에이터 어드바이저 '인기유입검색어' 붙여넣기 → 검색어 추출 → 연속성(며칠째) → 문서수 즉석 측정 → 직행/변형 판정.
 * 어드바이저는 네이버 로그인 세션이 필요해 서버가 직접 못 긁는다(세션 저장 = 계정 리스크) — 붙여넣기가 1단계다.
 * 기존 글감 파이프(topics)와 완전 분리된 추가 레인 — 8/5 동결 관측을 오염시키지 않는다.
 */
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 아직이에요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (process.env.PRELAUNCH === "true" && !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "아직 오픈 전이에요." }, { status: 403 });
  }
  const rl = await checkRateLimit(supabase, user.id, "briefing", 6, 300);
  if (!rl.ok) {
    return NextResponse.json({ error: `분석이 너무 잦아요. ${rl.retryAfterSec ?? 60}초 후 다시 시도해 주세요.` }, { status: 429 });
  }

  let body: { text?: string; images?: string[]; history?: { date: string; keywords: string[] }[] };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "요청이 올바르지 않아요." }, { status: 400 });
  }

  // ★스크린샷 지원(2026-08-10 유저: "이미지 안 들어가는데") — 유저의 자연 습관은 캡처다. 텍스트 복사를 가르치는 대신
  //  이미지를 읽는다(뇌빼기). 비전으로 검색어 줄만 뽑아 텍스트와 합친 뒤, 아래 동일 파이프(파서→측정)를 태운다.
  let visionText = "";
  const images = (Array.isArray(body.images) ? body.images : []).slice(0, 4);
  if (images.length > 0) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "AI 설정이 아직이에요." }, { status: 500 });
    const blocks: Anthropic.ImageBlockParam[] = [];
    for (const dataUrl of images) {
      const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl));
      if (!m || m[2].length > 2_500_000) continue; // 손상·과대 이미지는 조용히 건너뛴다(클라가 축소해 보냄)
      blocks.push({ type: "image", source: { type: "base64", media_type: m[1] as "image/png" | "image/jpeg" | "image/webp", data: m[2] } });
    }
    if (blocks.length > 0) {
      try {
        const client = new Anthropic({ apiKey });
        const res = await client.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 800,
          messages: [{
            role: "user",
            content: [
              ...blocks,
              { type: "text", text: "네이버 크리에이터 어드바이저 '인기유입검색어' 화면 캡처야. 화면에 보이는 검색어만 위에서 아래 순서 그대로, 한 줄에 하나씩 출력해. 순위 변동 표시(▲·▼·new·-)와 숫자, 날짜, 탭 이름, 안내 문구는 빼. ★글자가 조금이라도 불확실하거나 흐린 줄은 아예 빼라 — 비슷하게 지어내는 것이 최악이다(이 목록은 그대로 검색 베팅에 쓰인다). 검색어 외 다른 말은 아무것도 쓰지 마." },
            ],
          }],
        });
        void logUsage({ userId: user.id, model: "claude-haiku-4-5", kind: "briefing_vision", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
        const t = res.content.find((b) => b.type === "text");
        visionText = t && t.type === "text" ? t.text : "";
      } catch {
        return NextResponse.json({ error: "스크린샷을 읽지 못했어요. 다시 시도하거나 화면 글자를 복사해 붙여넣어 주세요." }, { status: 502 });
      }
    }
  }

  const { keywords, droppedNewsy } = parseAnswerSheet(`${body.text ?? ""}\n${visionText}`);
  if (keywords.length === 0) {
    return NextResponse.json({ error: "검색어를 못 찾았어요. 통계 화면을 전체 선택해 복사하거나, 검색어 목록이 보이는 스크린샷을 붙여넣어 주세요." }, { status: 400 });
  }
  const history = Array.isArray(body.history) ? body.history.slice(0, 7) : [];

  // 금융 브랜드 허용 여부는 분야로 갈린다(2026-08-05 원칙 — generate와 동일 기준).
  const { data: profileRow } = await supabase
    .from("blog_profiles").select("vertical,sub_category")
    .eq("user_id", user.id).eq("is_active", true).maybeSingle();
  const brandOk = { allowFinanceBrand: financeBrandAllowed(`${profileRow?.vertical ?? ""} ${profileRow?.sub_category ?? ""}`) };

  type Item = { keyword: string; days: number; docs: number | null; verdict: "direct" | "variant" | "unmeasured" | "blocked"; reason?: string };
  const items: Item[] = [];
  const startedAt = Date.now();
  const TIME_BUDGET_MS = 45_000; // maxDuration 60s에서 응답 몫을 뺀 측정 예산
  let measured = 0;
  let backedOff = false; // 429를 만나면 남은 건 미측정으로 두고 물러선다(호출 과다 악화 금지)

  for (const kw of keywords) {
    const days = daysSeenIn(kw, history) + 1; // 오늘 포함 N일째
    if (isUnsafeKeyword(kw, brandOk)) {
      items.push({ keyword: kw, days, docs: null, verdict: "blocked", reason: "업체명·가십·상품명 차단" });
      continue;
    }
    if (backedOff || measured >= 20 || Date.now() - startedAt > TIME_BUDGET_MS) {
      items.push({ keyword: kw, days, docs: null, verdict: "unmeasured" });
      continue;
    }
    const r = await fetchBlogTotalDetailed(kw);
    measured += 1;
    if (r.status === 429) backedOff = true;
    if (r.total == null) {
      items.push({ keyword: kw, days, docs: null, verdict: "unmeasured", reason: r.reason ?? undefined });
    } else if (r.total === 0) {
      // ★문서 0편 = 최고 추천이 아니라 오독 신호다(2026-08-10 실측: 비전이 '민생지원금'을 '민심지않금'으로
      //  읽으면 그 오타는 문서 0편이라 direct 최상위로 둔갑한다). 어드바이저에 오른 진짜 검색어가
      //  블로그 글 0편인 경우는 사실상 없다 — 유입을 만들었다는 건 이미 글이 있다는 뜻이다.
      items.push({ keyword: kw, days, docs: 0, verdict: "unmeasured", reason: "글 0편 — 잘못 읽혔을 수 있어요" });
    } else if (r.total < DOC_HARD_MAX) {
      items.push({ keyword: kw, days, docs: r.total, verdict: "direct" });
    } else {
      items.push({ keyword: kw, days, docs: r.total, verdict: "variant" });
    }
    await new Promise((res) => setTimeout(res, 120));
  }

  // 직행(문서 적은 순) → 변형 → 미측정 → 차단. 어드바이저 순서는 유입순이라 동률이면 원래 순서 유지(stable sort).
  const rank: Record<Item["verdict"], number> = { direct: 0, variant: 1, unmeasured: 2, blocked: 3 };
  items.sort((a, b) => rank[a.verdict] - rank[b.verdict] || (a.docs ?? Infinity) - (b.docs ?? Infinity));

  return NextResponse.json({ items, parsedKeywords: keywords, droppedNewsy, docMax: DOC_HARD_MAX });
}
