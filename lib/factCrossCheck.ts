// ★팩트 크로스체크(2026-08-11 유저: "최신 정보와 잘못된 정보 2번 체킹해야 해 — 글엔진 빡세게 재수정 설계").
//
//  사고 실물('61점 채점'): 예탁금 상향 시행일이 8/5로 나갔는데 실제로는 7/31로 '조기 시행'돼 있었다.
//  생성 시점에 물린 근거가 발표 시점 기사였고, 그 뒤의 변경(조기 시행)을 아무도 다시 보지 않았다.
//  교육시간 2시간(실제 3시간), 글 안 자기모순(앞 3,000만원·뒤 1,000만원)도 같은 구멍으로 새 나갔다.
//
//  ★설계 원칙(factGate 머리의 교훈 준수): 같은 모델에게 자기 글을 검수시키면 실패한다 —
//   쓸 때 한 오해는 읽을 때도 한다. 그래서 이 층은 '자기 검수'가 아니라
//   생성 직후 '지금 새로 검색한 근거'와의 대조다. 검증자는 글의 주장과 신선한 증거만 본다.
//  ★근거에 언급이 없는 주장은 고치라고 하지 않는다 — 근거 없는 교정은 새 오류를 만든다.
//   (잡는 것: 근거와 충돌 wrong / 근거에 더 최신 변경 stale / 추산·잠정을 확정처럼 overclaim / 글 내 자기모순 contradiction)

import Anthropic from "@anthropic-ai/sdk";
import { logUsage } from "./usageLog";

export interface FactXIssue { quote: string; problem: string; fix: string; kind: "wrong" | "stale" | "overclaim" | "contradiction" }

// 위험 주장 신호 — 숫자+단위, 시행·기한, 확정 표현이 든 문장만 검증 대상으로 뽑는다
const CLAIM_HINT_RE = /\d+\s*(월|일|년|시간|만\s?원|억\s?원?|조\s?원?|%|퍼센트|좌|개월)|시행|부터\b|까지\b|조기|상향|인하|확정|의무|잠정/;

/** 본문에서 검증할 주장 문장 추출(코드) — 태그 제거 후 문장 단위, 신호 있는 것만 최대 14개. */
export function extractClaimSentences(html: string): string[] {
  const text = String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const sents = text.split(/(?<=[.!?다요죠])\s+/).map((s) => s.trim()).filter((s) => s.length >= 10 && s.length <= 200);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of sents) {
    if (!CLAIM_HINT_RE.test(s)) continue;
    const key = s.replace(/\s+/g, "").slice(0, 40);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= 14) break;
  }
  return out;
}

/** 신선한 근거 수집 — 네이버 뉴스 최신순. 발표 '이후의 변경'(조기 시행류)을 잡는 게 목적이라 sort=date가 생명이다. */
export async function gatherFreshEvidence(keyword: string): Promise<string[]> {
  const id = process.env.NAVER_DATALAB_CLIENT_ID, secret = process.env.NAVER_DATALAB_SECRET;
  if (!id || !secret) return [];
  const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim();
  const lines: string[] = [];
  for (const q of [keyword, `${keyword} 시행`]) {
    try {
      const res = await fetch(`https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(q)}&sort=date&display=6`, {
        headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
      });
      if (!res.ok) continue;
      const d = (await res.json()) as { items?: { title?: string; description?: string; pubDate?: string }[] };
      for (const i of d.items ?? []) {
        const date = i.pubDate ? new Date(i.pubDate).toISOString().slice(0, 10) : "";
        lines.push(`- (${date}) ${strip(String(i.title ?? ""))} — ${strip(String(i.description ?? "")).slice(0, 160)}`);
      }
    } catch { /* 부분 수확 */ }
    await new Promise((r) => setTimeout(r, 150));
  }
  return Array.from(new Set(lines)).slice(0, 12);
}

/** 주장 vs 신선 근거 대조(sonnet 1콜). 근거가 없으면 빈 배열 — 함부로 고치지 않는 게 이 층의 안전핀이다. */
export async function crossCheckFacts(bodyHtml: string, keyword: string, userId?: string | null): Promise<FactXIssue[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];
  const claims = extractClaimSentences(bodyHtml);
  if (claims.length < 2) return [];
  const evidence = await gatherFreshEvidence(keyword);
  if (evidence.length < 3) return []; // 근거가 얇으면 검증하지 않는다(근거 없는 교정 금지)
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 900,
    messages: [{
      role: "user",
      content: [
        `블로그 글의 '주장 문장'들을 방금 검색된 '최신 뉴스 근거'와 대조해라. 주제: "${keyword}", 오늘 날짜 기준으로 판단.`,
        "판정 종류:",
        "- wrong: 근거와 숫자·날짜가 명백히 충돌",
        "- stale: 근거에 더 최신 변경이 있는데 글이 옛 기준(예: 발표 후 '조기 시행'으로 날짜가 앞당겨짐)",
        "- overclaim: 추산·잠정·범위가 있는 수치를 확정·전체처럼 씀, 또는 해석·전망을 사실처럼 단정(fix는 출처·범위를 명시한 완화문)",
        "- contradiction: 글 안에서 같은 항목의 숫자가 서로 다름(이건 근거 없이도 판정)",
        "★규칙: 근거에 언급이 없는 주장은 이슈로 내지 마라 — 근거 없는 교정은 새 오류다. 확실한 것만, 최대 8개.",
        'JSON만 출력: {"issues":[{"quote":"원문에서 그대로 발췌(30자 내)","problem":"짧게","fix":"교정문(근거 기준, 그대로 바꿔 쓸 수 있게)","kind":"wrong|stale|overclaim|contradiction"}]}',
        "", "[주장 문장]", ...claims.map((c) => `- ${c}`),
        "", "[최신 뉴스 근거(최신순)]", ...evidence,
      ].join("\n"),
    }],
  });
  void logUsage({ userId, model: "claude-sonnet-4-6", kind: "fact_xcheck", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
  const t = res.content.find((b) => b.type === "text");
  const m = /\{[\s\S]*\}/.exec(t && t.type === "text" ? t.text : "");
  if (!m) return [];
  try {
    const parsed = JSON.parse(m[0]) as { issues?: { quote?: string; problem?: string; fix?: string; kind?: string }[] };
    return (parsed.issues ?? [])
      .map((i) => ({
        quote: String(i.quote ?? "").slice(0, 60),
        problem: String(i.problem ?? "").slice(0, 80),
        fix: String(i.fix ?? "").slice(0, 200),
        kind: (["wrong", "stale", "overclaim", "contradiction"].includes(String(i.kind)) ? i.kind : "overclaim") as FactXIssue["kind"],
      }))
      .filter((i) => i.quote && i.fix)
      .slice(0, 8);
  } catch { return []; }
}
