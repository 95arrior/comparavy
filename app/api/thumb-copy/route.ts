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
    `네이버 블로그 썸네일에 큰 글씨로 박을 '3초 훅' 문구 6개를 만들어줘. 이건 심리전이다 — 스크롤하던 손가락을 멈추고 누르게 만드는 것이 유일한 목표. 절대 조건: 각 문구는 공백 포함 18자 이내(고정 폰트 — 한 줄 9자 x 2줄). 글 제목: "${art.title}" / 키워드: "${art.keyword}"${art.meta_description ? ` / 요지: ${String(art.meta_description).slice(0, 150)}` : ""}`,
    `본문 도입(이 글의 진짜 셀링포인트 — 문구는 이 내용에서만 나와야 한다): ${String((art as { body_html?: string }).body_html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 400)}`,
    "",
    "규칙:",
    "- ★6각도 강제 분산(전부 같은 프레임이면 실격) — 6개는 반드시 서로 다른 각도 하나씩: ①숫자 대비형(본문 실값 두 개의 충돌 — 남들 연 3.6% vs 내 통장 0.1%) ②질문형(그 돈 하루 굴리면 얼마?) ③미완결형(옮기기 전 이것 하나만) ④자격 발견형(통장만 있으면 오늘 시작) ⑤내용 요약형(CMA 금리 4곳 비교) ⑥손실 회피형(모르고 두면 이자 0원).",
    "- ★사실 정합(절대 조항) — 훅을 만들려고 본문에 없는 인과·위협을 지어내면 실격(실측 실격 예: 본문은 '6개월 내 퇴사 시 환수'인데 문구가 '지급일 놓치면 환수당한다' — 조건 바꿔치기). 본문이 명시한 사실만 극적으로 만들 수 있다.",
    "- ★완결된 구어 — 사람이 소리 내 말할 수 있는 문장만. '~다는 것', '~라는 게 핵심이다' 같은 문어 조각 실격.",
    "- ★주제어 의무 — 6개 전부에 이 글의 핵심 명사(제목·키워드의 실제 명사)가 들어가야 한다. '아는 사람만 써먹는 경로'처럼 무엇인지 없는 문구 실격.",
    "- ★숫자·날짜는 제목·요지·본문 도입에 실제로 있는 값만.",
    "- 금지: 무조건·100%·보장·충격·경악, 느낌표 2개 이상, 이모지.",
    "- 출력 계약(어기면 실패): 설명·비교·머리말 없이, 첫 글자가 [ 이고 마지막 글자가 ] 인 JSON 배열 한 줄만 출력한다. 예: [\"남들 연 3.6% 내 통장 0.1%\",\"CMA 금리 4곳 비교\"]",
  ].join("\n");
  try {
    // ★빈손 금지 3단(실측: 간헐 '문구를 만들지 못했어요' — 필터 전멸이 원인): AI→관대한 회수→규칙 폴백
    let copies: string[] = [];
    for (let attempt = 0; attempt < 2 && copies.length === 0; attempt++) {
      const res = await client.messages.create({ model: "claude-haiku-4-5", max_tokens: 800, messages: [{ role: "user", content: prompt }] }); // ★800(실측 2026-07-13: 300이 6문구 JSON을 잘라 폴백 템플릿 서빙 — 에버그린 제목과 동일 병)
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
      if (copies.length === 0) console.error(`[thumb-copy] 시도${attempt + 1} 전멸 — raw:${Array.isArray(raw) ? raw.length : 0} (18자·분할·주제어·숫자 게이트 통과 0) kw:${String(art.keyword ?? "").slice(0, 20)}`);
    }
    if (copies.length === 0) {
      // 최후 폴백 — 규칙 기반(원가 0, 항상 성공): 키워드 훅 템플릿
      const kw = String(art.keyword ?? art.title ?? "").split(/\s+/).slice(0, 2).join(" ").slice(0, 10) || "이번 정보";
      // ★제목 훅 우선(실측: 템플릿 4종이 어떤 키워드든 판박이) — 제목의 각도(쉼표·콜론 뒤)를 1순위 폴백으로
      const { hookCopyFromTitle } = await import("@/lib/wpFeaturedImage");
      const titleHook = hookCopyFromTitle(art.title, kw).slice(0, 18);
      // ★9자/줄 분할 검증을 폴백에도(실측: '경기도 청년안심주택, 지금 확인' — 11자 줄이 새서 썸네일 축소) — 안 쪼개지면 어절을 덜어 맞춘다
      const fit9 = (c: string): string | null => {
        let t = c.trim();
        for (let i = 0; i < 4; i++) {
          if (breakThumbCopy(t).split("\n").every((l) => [...l].length <= 9)) return t;
          if (!t.includes(" ")) return null;
          t = t.split(" ").slice(0, -1).join(" ").replace(/[,，]$/, "");
        }
        return null;
      };
      copies = [...new Set([titleHook, `${kw}, 이것부터`, `${kw} 그대로 두면 손해`, `${kw}, 지금 확인`]
        .map(fit9).filter((c): c is string => !!c && [...c].length >= 4))].slice(0, 4);
      if (copies.length === 0) copies = [kw.slice(0, 9)];
    }
    return NextResponse.json({ copies });
  } catch {
    return NextResponse.json({ error: "문구를 만들지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
