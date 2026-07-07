import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rateLimit";
import { bannedHits } from "@/lib/hookPatterns";
import { logUsage } from "@/lib/usageLog";

export const maxDuration = 30;

// ★썸네일 3초 훅 문구 추천(유저 요청 2026-07-05) — 유저가 직접 만드는 썸네일용 짧은 어그로 카피 4개.
//  원칙: 어그로되 '글이 실제로 답하는 약속'만(열린 고리) + 금지어(무조건·보장·충격류)는 코드로 걸러 재요청 없이 폐기.
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const rl = await checkRateLimit(supabase, user.id, "thumb_copy", 30, 3600); // 30회/시간 — 남용 방지(무료 기능)
  if (!rl.ok) return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  const articleId = typeof body.articleId === "string" ? body.articleId.slice(0, 60) : "";
  if (!articleId) return NextResponse.json({ error: "글을 알 수 없어요." }, { status: 400 });
  const { data: art } = await supabase.from("articles").select("title, keyword, meta_description").eq("id", articleId).eq("user_id", user.id).maybeSingle();
  if (!art) return NextResponse.json({ error: "글을 찾을 수 없어요." }, { status: 404 });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const prompt = [
    `네이버 블로그 썸네일에 큰 글씨로 박을 '3초 훅' 문구 6개를 만들어줘. 글 제목: "${art.title}" / 키워드: "${art.keyword}"${art.meta_description ? ` / 요지: ${String(art.meta_description).slice(0, 100)}` : ""}`,
    "",
    "규칙:",
    "- 6~14자, 구어체. ★무난한 요약은 실격 — 심장을 건드려야 한다: 손해의 공포, 남만 아는 정보라는 소외감, 단정적 선언, 뒤통수 반전. 단 글이 실제로 답하는 내용과 반드시 연관(낚시 금지).",
    "- 온도 비교(이 차이를 이해하라): 무난(실격) '재산세 줄이는 법' → 훅(합격) '고지서 그대로 내면 손해' / 무난 '증여 타이밍 정리' → 훅 '3월 전에 증여해야 하는 이유' / 무난 '임대인 신원확인 방법' → 훅 '임대인 신원확인, 이게 핵심이다'",
    "- 서로 다른 각도로 6가지: 손해 경고(그대로 두면 새는 돈) / 단정 선언(~이게 핵심이다) / 마감 압박(날짜 명시) / 소외감(아는 사람만 하는) / 반전(통념 뒤집기) / 대상 저격(00라면 지금).",
    "- 금지: 무조건·100%·보장·충격·경악, 느낌표 2개 이상, 이모지.",
    "- 출력은 JSON 배열만: [\"문구1\", ...]",
  ].join("\n");
  try {
    const res = await client.messages.create({ model: "claude-haiku-4-5", max_tokens: 300, messages: [{ role: "user", content: prompt }] });
    void logUsage({ userId: user.id, model: "claude-haiku-4-5", kind: "thumb_copy", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
    const text = res.content.find((b) => b.type === "text")?.text ?? "[]";
    const m = text.match(/\[[\s\S]*\]/);
    const raw: unknown = m ? JSON.parse(m[0]) : [];
    const copies = (Array.isArray(raw) ? raw : [])
      .map((c) => String(c).trim().replace(/^["'\s]+|["'\s]+$/g, ""))
      .filter((c) => c.length >= 4 && c.length <= 18)
      .filter((c) => bannedHits(c).length === 0) // 과장·보장류는 코드로 폐기
      .slice(0, 4);
    if (copies.length === 0) return NextResponse.json({ error: "문구를 만들지 못했어요. 다시 시도해 주세요." }, { status: 502 });
    return NextResponse.json({ copies });
  } catch {
    return NextResponse.json({ error: "문구를 만들지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
