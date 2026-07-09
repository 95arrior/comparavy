import { NextResponse } from "next/server";
import { breakThumbCopy } from "@/lib/thumbCopyBreak";
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
  const { data: art } = await supabase.from("articles").select("title, keyword, meta_description, body_html").eq("id", articleId).eq("user_id", user.id).maybeSingle();
  if (!art) return NextResponse.json({ error: "글을 찾을 수 없어요." }, { status: 404 });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const prompt = [
    `네이버 블로그 썸네일에 큰 글씨로 박을 '3초 훅' 문구 6개를 만들어줘. 절대 조건: 각 문구는 공백 포함 18자 이내(폰트가 고정 크기라 길면 잘린다 — 한 줄 9자 x 2줄에 들어가야 함). 글 제목: "${art.title}" / 키워드: "${art.keyword}"${art.meta_description ? ` / 요지: ${String(art.meta_description).slice(0, 100)}` : ""}`,
    "",
    "규칙:",
    "- 6~14자, 구어체. ★무난한 요약은 실격 — 심장을 건드려야 한다: 손해의 공포, 남만 아는 정보라는 소외감, 단정적 선언, 뒤통수 반전. 단 글이 실제로 답하는 내용과 반드시 연관(낚시 금지).",
    "- 온도 비교(이 차이를 이해하라): 무난(실격) '재산세 줄이는 법' → 훅(합격) '고지서 그대로 내면 손해' / 무난 '증여 타이밍 정리' → 훅 '3월 전에 증여해야 하는 이유' / 무난 '임대인 신원확인 방법' → 훅 '임대인 신원확인, 이게 핵심이다'",
    "- 서로 다른 각도로 6가지: 손해 경고(그대로 두면 새는 돈) / 단정 선언(~이게 핵심이다) / 마감 압박(날짜 명시) / 소외감(아는 사람만 하는) / 반전(통념 뒤집기) / 대상 저격(00라면 지금).",
    "- 금지: 무조건·100%·보장·충격·경악, 느낌표 2개 이상, 이모지.",
    "- 출력 계약(어기면 실패): 설명·비교·머리말 없이, 첫 글자가 [ 이고 마지막 글자가 ] 인 JSON 배열 한 줄만 출력한다. 예: [\"고지서 그대로 내면 손해\",\"3월 전 증여가 답인 이유\"]",
  ].join("\n");
  try {
    // ★빈손 금지 3단(실측: 간헐 '문구를 만들지 못했어요' — 필터 전멸이 원인): AI→관대한 회수→규칙 폴백
    let copies: string[] = [];
    for (let attempt = 0; attempt < 2 && copies.length === 0; attempt++) {
      const res = await client.messages.create({ model: "claude-haiku-4-5", max_tokens: 300, messages: [{ role: "user", content: prompt }] });
      void logUsage({ userId: user.id, model: "claude-haiku-4-5", kind: "thumb_copy", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
      const text = res.content.find((b) => b.type === "text")?.text ?? "[]";
      const m = text.match(/\[[\s\S]*\]/);
      let raw: unknown = [];
      try { raw = m ? JSON.parse(m[0]) : []; } catch { raw = []; }
      if (!Array.isArray(raw) || raw.length === 0) {
        // 파싱 폴백 — 따옴표 줄 추출
        raw = [...text.matchAll(/["\u201c']([^"\u201d'\n]{4,20})["\u201d']/g)].map((x) => x[1]);
      }
      const cleaned = (Array.isArray(raw) ? raw : [])
        .map((c) => String(c).trim().replace(/^[\[\]"\u201c\u201d'\s]+|[\[\]"\u201c\u201d'\s]+$/g, "")) // ★대괄호·스마트따옴표 찌꺼기 소거(실측: 앞뒤 [])
        .filter((c) => c.length >= 4)
        .map((c) => ([...c].length > 18 ? "" : c)) // ★18자 상한(유저 규격: 고정 폰트 1줄 9자·2줄 — 초과는 후보 제외)
        .filter((c) => c && breakThumbCopy(c).split("\n").every((l) => [...l].length <= 9)) // ★9자/줄 분할 가능까지 검사(어절 배분상 불가 문구 제외)
        .filter((c) => { // ★주제어 게이트(실측: '아는 사람만 써먹는 경로' — 무엇의 경로인지 부재) — 키워드·제목의 실질 명사 1개 필수
          const stop = new Set(["방법", "정리", "조건", "확인", "신청", "가능", "지금", "오늘", "이유", "핵심", "순서", "전에", "먼저"]);
          const toks = `${art.keyword ?? ""} ${art.title ?? ""}`.split(/[\s,·]+/).map((t) => t.replace(/[^가-힣a-zA-Z0-9]/g, "")).filter((t) => t.length >= 2 && !stop.has(t));
          return toks.length === 0 || toks.some((t) => c.includes(t) || (t.length >= 4 && c.includes(t.slice(0, Math.max(3, t.length - 2)))));
        })
        .filter((c) => { // ★숫자 근거 게이트(실측: 접수 13일인데 '7월 14일까지' 유령 날짜) — 소스에 없는 숫자 문구 제외
          const src = `${art.title ?? ""} ${art.keyword ?? ""} ${art.meta_description ?? ""} ${String((art as { body_html?: string }).body_html ?? "").replace(/<[^>]+>/g, " ").slice(0, 1200)}`.replace(/[,\s]/g, "");
          for (const num of c.match(/[0-9][0-9,.]*/g) ?? []) {
            const n = num.replace(/,/g, "");
            if (n.length >= 1 && !src.includes(n)) return false;
          }
          return true;
        })
        .filter(Boolean)
        .filter((c) => bannedHits(c).length === 0);
      copies = [...new Set(cleaned)].slice(0, 4);
    }
    if (copies.length === 0) {
      // 최후 폴백 — 규칙 기반(원가 0, 항상 성공): 키워드 훅 템플릿
      const kw = String(art.keyword ?? art.title ?? "").split(/\s+/).slice(0, 2).join(" ").slice(0, 10) || "이번 정보";
      copies = [`${kw}, 이게 핵심이다`, `${kw} 그대로 두면 손해`, `${kw}, 지금 확인`, `${kw} 모르면 나만 손해`].map((c) => [...c].slice(0, 18).join(""));
    }
    return NextResponse.json({ copies });
  } catch {
    return NextResponse.json({ error: "문구를 만들지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
