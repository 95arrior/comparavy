import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { ensureUserRow } from "@/lib/userPlan";
import { checkRateLimit } from "@/lib/rateLimit";

// 편집화면 '섹션 추가 추천' — 발행 전 글에 체류시간↑ 섹션을 한 개씩 붙인다.
// ★정직 가드: 가짜 후기·가짜 가격 숫자 금지(표시광고법·정직노선). 가이드형(요인·기준)으로.
type SectionType = "price" | "checklist" | "compare";

const SPECS: Record<SectionType, { label: string; rule: string }> = {
  price: {
    label: "가격 가이드",
    rule:
      "이 글 주제의 '가격 가이드' 섹션. <h2>제목</h2> 다음 <p>와 <ul>로.\n" +
      "★중요: ① 구체적 금액을 단정하지 마 — 지역·상황·업체마다 다르다. '가격이 달라지는 요인'(무엇 때문에 비싸지고 싸지는지)과 '견적 비교할 때 확인할 점' 위주로 써라. ② 일반적으로 통용되는 대략 범위는 '대체로 ○○ 정도'처럼 여지를 두고만 언급 가능(없으면 생략). ③ 최저가·할인·보장 같은 광고·단정 표현 금지.",
  },
  checklist: {
    label: "확인 포인트",
    rule:
      "이 글 주제에서 '고르거나 결정할 때 확인할 포인트' 섹션. <h2>제목</h2> 다음 <ul>로 5개 내외 체크리스트, 각 항목은 한 문장 설명까지.\n" +
      "★중요: 실질적이고 구체적인 기준만(막연한 말 금지). 특정 업체·브랜드 실명 비교·추천 금지. 과장·보장 금지.",
  },
  compare: {
    label: "비교 기준",
    rule:
      "이 글 주제에서 '어떤 걸 고르면 좋을까 — 비교·선택 기준' 섹션. <h2>제목</h2> 다음 <p>와 <ul>로.\n" +
      "★중요: 특정 업체·브랜드·제품을 실명으로 나열·비교하지 마(상표권·비교광고 위험). 일반적인 '유형별 장단점'과 '내 상황에 맞게 고르는 기준'으로. 과장·보장 금지.",
  },
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const planRow = await ensureUserRow(supabase, user.id);
  if (planRow.plan !== "pro") {
    return NextResponse.json({ error: "섹션 추가는 프로 플랜 기능이에요.", upgrade: true }, { status: 403 });
  }

  let body: { type?: string };
  try { body = await request.json(); } catch { body = {}; }
  const type = body.type as SectionType;
  if (!type || !SPECS[type]) return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });

  const rl = await checkRateLimit(supabase, user.id, "section_add", 15, 300);
  if (!rl.ok) return NextResponse.json({ error: `요청이 너무 잦아요. ${rl.retryAfterSec ?? 60}초 후 다시 시도해 주세요.` }, { status: 429 });
  const rlDay = await checkRateLimit(supabase, user.id, "section_add_day", 80, 86400);
  if (!rlDay.ok) return NextResponse.json({ error: "오늘 섹션 추가 횟수를 다 썼어요. 내일 다시 이용해 주세요." }, { status: 429 });

  const { data: article } = await supabase
    .from("articles")
    .select("title, body_html, keyword")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!article) return NextResponse.json({ error: "글을 찾지 못했어요." }, { status: 404 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI 설정이 아직이에요." }, { status: 500 });

  const plain = (article.body_html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2200);
  const spec = SPECS[type];

  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 900,
      messages: [
        {
          role: "user",
          content:
            `아래 한국어 블로그 글에 덧붙일 한 개 섹션을 HTML로 써줘.\n\n` +
            `[글 제목] ${article.title}\n[키워드] ${article.keyword ?? ""}\n[본문 일부] ${plain}\n\n` +
            `[써야 할 섹션]\n${spec.rule}\n\n` +
            `공통 규칙: ① 위 글의 주제·맥락에 정확히 맞출 것 ② 출력은 <h2>…</h2>로 시작하는 순수 HTML 조각만(설명·코드블록·머리말 없이) ③ 허용 태그: h2, h3, p, ul, li, strong ④ 한국어, 기존 글과 같은 정보·조언 톤 ⑤ 가짜 후기·가짜 수치·과장·보장 절대 금지.`,
        },
      ],
    });
    let html = res.content.map((c) => (c.type === "text" ? c.text : "")).join("").trim();
    // 코드블록 펜스 제거 + h2 앞 잡텍스트 제거
    html = html.replace(/```html?/gi, "").replace(/```/g, "").trim();
    const h2 = html.indexOf("<h2");
    if (h2 > 0) html = html.slice(h2);
    if (!html.startsWith("<h2")) return NextResponse.json({ error: "섹션 생성에 실패했어요. 다시 시도해 주세요." }, { status: 502 });

    return NextResponse.json({ html, label: spec.label });
  } catch {
    return NextResponse.json({ error: "섹션 생성에 실패했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
