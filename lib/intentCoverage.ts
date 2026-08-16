// ★INTENT_COVERAGE(2026-08-17 유저 v2.1 ①) — INTENT_MATCH(제목이 의도를 약속하는가)와 분리된 두 번째 층:
//  본문이 그 약속을 '실제로 해결'하는가. 실물 사고: 키워드 '평면도'인데 제목에만 평면도가 있고
//  본문은 모델하우스·분양 일정뿐 — 제목·도입 검사(INTENT_MATCH)는 통과하지만 검색자는 답을 못 받는다.
//  방식: 검색어에서 요구 답변 체크리스트를 만들게 하고, 본문이 각각을 해결하는지 채점(0~100).
import Anthropic from "@anthropic-ai/sdk";
import { logUsage } from "./usageLog";

export interface IntentCoverage { score: number; missing: string[] }

export async function scoreIntentCoverage(
  keyword: string,
  title: string,
  bodyHtml: string,
  userId?: string | null,
): Promise<IntentCoverage | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const text = String(bodyHtml || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000);
  if (text.length < 300) return null;
  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 700,
      messages: [{
        role: "user",
        content: [
          `검색어 "${keyword}"를 네이버에 친 사람이 얻고 싶은 '요구 답변 체크리스트'를 3~5개 만들고, 아래 본문이 각각을 실제로 해결하는지 채점하라.`,
          "★기준: 언급만 하면 미해결이다 — 구체 정보(구조·수치·기준·방법)를 줘야 해결. 예: '평면도'면 타입별 구조·전용면적·타입 차이가 있어야지, '평면도가 궁금한 분들이 많습니다'는 0점.",
          `글 제목: "${title}"`,
          '출력 JSON만: {"checks":[{"q":"요구 답변","covered":true}],"score":0~100}',
          "", "[본문]", text,
        ].join("\n"),
      }],
    });
    void logUsage({ userId, model: "claude-haiku-4-5", kind: "intent_coverage", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
    const t = res.content.find((b) => b.type === "text");
    const m = /\{[\s\S]*\}/.exec(t && t.type === "text" ? t.text : "");
    if (!m) return null;
    const j = JSON.parse(m[0]) as { checks?: { q?: string; covered?: boolean }[]; score?: number };
    const score = Math.max(0, Math.min(100, Math.round(Number(j.score ?? 0))));
    const missing = (j.checks ?? []).filter((c) => c.covered === false).map((c) => String(c.q ?? "").slice(0, 60)).filter(Boolean);
    return { score, missing };
  } catch { return null; }
}
