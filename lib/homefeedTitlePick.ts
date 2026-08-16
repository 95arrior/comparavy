// ★홈피드 제목 파이프(2026-08-14 유저 확정 — "현재 홈판이 압도적, 우리는 99% 홈판을 노려야 한다.
//  CTR 카피라이터로서 ①클릭률 높은 제목 후보 ②최적 선정 ③제목과 자연스럽게 연결되는 본문").
//  홈피드는 검색과 로직이 다르다: 특정 검색어 1등이 아니라 '이 콘텐츠를 이 사람에게 보여줬을 때
//  반응할 확률' 게임 — 후보 노출→반응 확인→확장/감소. 그래서 제목을 본문과 한 몸으로 뽑지 않고,
//  후보 6개를 만들어 자가 채점으로 1개를 고른 뒤 본문이 그 제목의 약속을 이행하게 한다.
import Anthropic from "@anthropic-ai/sdk";
import { logUsage } from "./usageLog";
import { TITLE_SHAPE_RULE } from "./titleTypes";
import { validateHomefeedTitle } from "./titleRules";

export async function pickHomefeedTitle(args: {
  keyword: string;
  brief?: string | null;
  news?: string | null;
  recentTitles?: string[];
  userId?: string | null;
  /** ★서사(홈판) 글이면 제목+썸네일 패키지 모드(2026-08-17 유저: "홈에서는 썸네일+제목을 한 번에 본다") */
  narrative?: boolean;
}): Promise<{ title: string; why: string; thumbConcept?: string } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1600, // ★900은 후보 6개+채점 JSON이 잘렸다(2026-08-14 실측: 파싱 실패→픽 무음 소실)
      messages: [{
        role: "user",
        content: [
          args.narrative
            ? `너는 네이버 홈피드 전문 CTR 카피라이터다. 키워드 "${args.keyword}" 글의 [제목+썸네일 패키지]를 설계하라(2026-08-17 확정 — 홈에서 사람은 썸네일과 제목을 한 번에 본다): ①이 소재의 홈 핵심 감정 1개 선정(손해·불안·의외·안도 중) ②썸네일 콘셉트 3개 — 경제를 보여주지 말고 '경제 때문에 벌어진 장면'을(통장 잔액 보는 손·식탁 위 고지서·카드 명세서 보는 사람 결. 차트·그래프 금지) ③콘셉트마다 어울리는 제목 2개 ④6개 패키지를 채점해 최고 1세트를 골라라.`
            : `너는 네이버 홈피드 전문 CTR 카피라이터다. 키워드 "${args.keyword}" 글의 제목 후보 6개를 만들고, 스스로 채점해 최고 1개를 골라라.`,
          "★홈피드 로직: 검색 상위노출이 아니라 '피드를 스크롤하던 사람이 멈추고 반응할 확률' 게임이다. 멈추게 하는 3요소 = 내 상황 대입(공감) · 구체 숫자 · 호기심 갭(안 누르면 손해).",
          "채점 기준(후보마다): ①스크롤 중 3초 안에 멈출까 ②'내 얘기네'로 느껴질까 ③안 누르면 손해 같을까 ④★제목이 건 약속을 본문이 지킬 수 있나 — 본문이 못 지킬 과장은 낚시라 확산이 죽는다(즉시 감점). ⑤★주장 방향이 근거와 일치하나(2026-08-14 실측: 내용은 '공급 늘려도 집값이 안 잡힌다'인데 제목이 '왜 안 오를까'로 정반대) — 방향 뒤집힌 제목은 클릭돼도 배신감으로 끝난다, 실격.",
          "후보 6개는 돼지통 홈판 6패턴을 하나씩(2026-08-17 유저 확정): ①금액형(월급 350이면 실제로 빠져나가는 돈은 이 정도) ②변화형(다음 달부터 직장인이 확인할 돈 하나가 생겼다) ③질문형(1억이 있다면 지금 예금이 맞을까?) ④의외형(금리가 내려갔는데 오히려 좋아진 사람들) ⑤대상형(40대 직장인이라면 이 통장부터) ⑥선택형(예금 vs 파킹, 5천만원이면 어디?). 홈판 공식 = 대상+사건+결과, 키워드 나열 금지. 같은 어미 반복 금지.",
          TITLE_SHAPE_RULE,
          args.recentTitles?.length ? `최근 발행 제목(같은 틀·어미와 겹치면 감점): ${args.recentTitles.slice(0, 6).map((t) => `"${t}"`).join(" / ")}` : "",
          args.news ? `[최신 근거]\n${String(args.news).slice(0, 800)}` : "",
          args.brief ? `[글감 브리프]\n${String(args.brief).slice(0, 500)}` : "",
          args.narrative ? '출력 JSON만: {"emotion":"핵심 감정","best":"최고 패키지의 제목 그대로","thumb":"그 패키지의 썸네일 콘셉트 한 문장(장면 묘사)","why":"한 줄"}' : '출력 JSON만: {"candidates":["6개"],"best":"후보 중 1개 그대로","why":"고른 이유 한 줄"}',
        ].filter(Boolean).join("\n"),
      }],
    });
    void logUsage({ userId: args.userId, model: "claude-haiku-4-5", kind: "homefeed_title", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
    const t = res.content.find((b) => b.type === "text");
    const textOut = t && t.type === "text" ? t.text : "";
    let best = "";
    let why = "";
    let thumb = "";
    const m = /\{[\s\S]*\}/.exec(textOut);
    if (m) {
      try { const j = JSON.parse(m[0]) as { best?: string; why?: string; thumb?: string }; best = String(j.best ?? "").trim(); why = String(j.why ?? ""); thumb = String(j.thumb ?? "").trim(); } catch { /* 잘린 JSON — 아래 폴백 */ }
    }
    if (!best) { const bm = /"best"\s*:\s*"([^"]+)"/.exec(textOut); if (bm) best = bm[1].trim(); } // ★잘려도 best만 건진다
    best = best.replace(/^["']|["']$/g, "").replace(/\s*[—–]\s*/g, ", ").replace(/\s+-\s+/g, ", ").slice(0, 80); // ★대시 금지(2026-08-17)
    if (!best) { console.log("[hf-title] 픽 실패 — best 없음(출력 잘림 의심)"); return null; }
    // 홈판 규격 게이트 — 미달이면 픽을 버리고 기존 경로(본문 생성기가 직접 짓기)로 둔다. 나쁜 픽 강제가 최악이다.
    const v = validateHomefeedTitle(best, args.keyword);
    if (!v.ok) { console.log(`[hf-title] 픽 실격(${v.reason}): "${best}"`); return null; }
    return { title: best, why: why.slice(0, 120), thumbConcept: thumb ? thumb.slice(0, 160) : undefined };
  } catch { return null; }
}
