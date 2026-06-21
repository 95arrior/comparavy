import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { ensureUserRow } from "@/lib/userPlan";
import { checkRateLimit } from "@/lib/rateLimit";

// 블로그 글 → 스레드(Threads) 최적화 게시물(~120자, 짧을수록 잘 읽힘). 7원칙을 프롬프트로 박는다.
// ★스레드 전략(사용자 정의): 첫문장 후킹+숫자 / 쪼개기·짧은 문장 / 대화 유발(질문) / 의외성 /
//   간접 가치입증(거짓 없이) / 다짜고짜 홍보 금지 / 우리 글에서 파생.
type Style = "list" | "question" | "twist";

const STYLE_RULE: Record<Style, string> = {
  list: "형식=리스트형. 핵심을 '○○ N가지'처럼 번호로 정리. 첫 줄에 숫자가 들어간 강한 후킹(예: '하루 1분, ○○ 3가지').",
  question: "형식=질문형. 대중이 공감·궁금해할 질문을 던져 댓글을 유발(표본이 큰 보편적 질문). 예: '전세, 지금 들어가면 손해일까요?' / '영어학원 vs 어학원?'. 글 내용으로 그 질문에 힌트를 주되 결론은 살짝 열어둬 댓글을 부른다.",
  twist: "형식=의외성형. 대중의 상식과 반대되는 한 줄로 시작해 예상을 깬다(반전). 예: '○○부터 하면 거의 실패해요'. 그 뒤 왜 그런지 풀어준다.",
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const planRow = await ensureUserRow(supabase, user.id);
  if (planRow.plan !== "pro") {
    return NextResponse.json({ error: "스레드 변환은 프로 플랜 기능이에요.", upgrade: true }, { status: 403 });
  }

  let body: { style?: string };
  try { body = await request.json(); } catch { body = {}; }
  const style = body.style as Style;
  if (!style || !STYLE_RULE[style]) return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });

  const rl = await checkRateLimit(supabase, user.id, "threads_convert", 15, 300);
  if (!rl.ok) return NextResponse.json({ error: `요청이 너무 잦아요. ${rl.retryAfterSec ?? 60}초 후 다시 시도해 주세요.` }, { status: 429 });
  const rlDay = await checkRateLimit(supabase, user.id, "threads_convert_day", 80, 86400);
  if (!rlDay.ok) return NextResponse.json({ error: "오늘 스레드 변환 횟수를 다 썼어요. 내일 다시 이용해 주세요." }, { status: 429 });

  const { data: article } = await supabase
    .from("articles")
    .select("title, body_html, keyword")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!article) return NextResponse.json({ error: "글을 찾지 못했어요." }, { status: 404 });

  const { data: profile } = await supabase
    .from("blog_profiles")
    .select("biz_name, biz_strength")
    .eq("user_id", user.id)
    .maybeSingle();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI 설정이 아직이에요." }, { status: 500 });

  const plain = (article.body_html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2400);
  const bizHint = profile?.biz_name
    ? `\n[운영자] '${profile.biz_name}'${profile.biz_strength ? ` (강점: ${profile.biz_strength})` : ""} — 직접 홍보·상호 나열·예약요청 금지. 이 분야를 다룬다는 신뢰만 은근히, 강점은 거짓 없이 자연스러울 때만 딱 한 번.`
    : "";

  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 350,
      messages: [
        {
          role: "user",
          content:
            `아래 블로그 글을 '스레드(Threads)' 게시물 한 개로 변환해줘.\n\n` +
            `[글 제목] ${article.title}\n[키워드] ${article.keyword ?? ""}\n[본문] ${plain}${bizHint}\n\n` +
            `[${STYLE_RULE[style]}]\n\n` +
            `스레드 필수 규칙:\n` +
            `0) ★무엇에 대한 글인지(핵심 주제·키워드)가 반드시 드러나야 한다. 특징·인사이트만 압축하고 정작 '주제'를 빼지 마라. 첫 1~2줄만 봐도 '무슨 얘기인지' 알게, 위 [키워드]를 자연스럽게 본문에 녹여라(해시태그로 때우지 말 것).\n` +
            `1) 첫 문장이 생명. 지루하면 바로 넘겨버린다. 추상·모호 금지, 숫자를 적극 활용해 시선을 잡아라.\n` +
            `2) ★길이가 핵심: 전체 120자 내외(공백 포함, 90~140자). 절대 150자를 넘기지 마라. 짧을수록 끝까지 읽힌다 — 군더더기·중복·부연 다 쳐내고 알맹이만.\n` +
            `3) 2~4줄로 짧게 끊어라(빈 줄 1~2번). 한 줄에 한 호흡 — 스캔만 해도 읽히게.\n` +
            `4) 다짜고짜 홍보 금지. 잠재 고객에게 '도움되는 정보'로 신뢰를 쌓는다.\n` +
            `5) 마지막 줄은 대화를 부르는 한 마디(질문/공감 유도).\n` +
            `6) 과장·보장·최고·1위·100% 같은 단정 금지. 거짓 정보 금지.\n` +
            `7) 출력은 '스레드에 그대로 붙여넣을 순수 텍스트'만(설명·따옴표·마크다운·머리말 없이). 해시태그는 끝에 0~2개만(필요할 때).`,
        },
      ],
    });
    let text = res.content.map((c) => (c.type === "text" ? c.text : "")).join("").trim();
    text = text.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
    if (!text) return NextResponse.json({ error: "변환에 실패했어요. 다시 시도해 주세요." }, { status: 502 });

    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: "변환에 실패했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
