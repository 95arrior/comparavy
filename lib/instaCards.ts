// ★인스타 카드뉴스 압축(2026-08-11 유저: "네이버만 올리는 게 아깝다 — 한 글감을 인스타용으로도").
//
//  구조: 완성된(팩트 크로스체크 통과한) 블로그 글을 카드뉴스 문구로 압축한다 — 새 사실 생성 금지, 압축만.
//  그래서 인스타 버전도 본문과 같은 신뢰도를 갖는다. 이미지는 유저가 직접 구한다(문구만 만든다).
//  ★표지는 홈판 썸네일 문법(유저 지시: "결핍을 긁거나 돈으로 유혹") — 검색이 아니라 피드 판이라 대중 훅이 무기다.
//  ★장수는 6~10 가변(유저 '제한 없이' 요청에 상한을 되돌려 제안·승인 — 인스타 캐러셀 기술 상한 10장, 완독은 6~8장).

import Anthropic from "@anthropic-ai/sdk";
import { logUsage } from "./usageLog";

export interface InstaCard { head: string; body: string }
export interface ClipScript { hook: string; lines: string[]; cta: string }
export interface InstaPack { cover: string; cards: InstaCard[]; cta: InstaCard; caption: string; clip?: ClipScript }

export async function articleToInstaCards(title: string, bodyHtml: string, keyword: string, userId?: string | null): Promise<InstaPack | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const text = String(bodyHtml || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 6000);
  if (text.length < 300) return null;
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1900,
    messages: [{
      role: "user",
      content: [
        `아래 블로그 글(제목: "${title}", 키워드: "${keyword}")을 인스타그램 카드뉴스 문구로 압축해라. 경제·재테크 계정이다.`,
        "★절대 규칙: 글에 있는 사실만 쓴다 — 새 숫자·새 주장 금지(이 글은 팩트체크를 통과했고, 카드는 압축본이다).",
        "",
        "[표지 cover] 홈피드 훅 문법 — 결핍을 긁거나 돈으로 유혹: 잃는 돈·놓치는 혜택·구체 숫자 앵커. 최대 2줄(\\n), 줄당 12자 내. 제목 문장 반복 금지 — 표지는 궁금증, 카드가 답. 예: '현금 3,000만\\n없으면 막힌다'.",
        "[카드 cards] 4~8장. 각 장 = head(한 줄 12자 내) + body(2~3줄, 줄당 18자 내, \\n 구분). 표지의 궁금증을 순서대로 푼다: 무슨 일이 → 왜 → 핵심 숫자·조건 → 함정 → 지금 할 것. 앞 장 끝이 다음 장을 궁금하게(넘기게 만드는 흐름).",
        "[마지막 장 cta] head=행동 한 줄, body=오늘 할 첫걸음 + '자세한 계산·최신 기준은 프로필 링크에'.",
        "[caption] 인스타 캡션: 훅 1줄 + 핵심 요약 2~3줄 + 해시태그 12~15개(#재테크 #경제 같은 대중 태그 + 소재 태그. 한 줄에 몰아서).",
        "[클립 clip] 네이버 클립용 캐릭터 대사(2026-08-11 유저: '캐릭터가 말하는, 간단명료 핵심 대사만'): hook=첫 3초 대사(결핍·돈 훅을 말로 — '현금 3천만 없으면 이제 못 삽니다' 결), lines=6~10문장(카드와 같은 흐름을 구어체 짧은 대사로 — 한 문장에 한 정보, 말하듯 '~예요/~거든요', 문어체·긴 종속절 금지), cta=마지막 대사('자세한 계산은 블로그에 정리해뒀어요' 결). 대사도 글에 있는 사실만.",
        "",
        '출력 JSON만: {"cover":"...","cards":[{"head":"...","body":"..."}],"cta":{"head":"...","body":"..."},"caption":"...","clip":{"hook":"...","lines":["..."],"cta":"..."}}',
        "", "[본문]", text,
      ].join("\n"),
    }],
  });
  void logUsage({ userId, model: "claude-haiku-4-5", kind: "insta_cards", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
  const t = res.content.find((b) => b.type === "text");
  const m = /\{[\s\S]*\}/.exec(t && t.type === "text" ? t.text : "");
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]) as Partial<InstaPack>;
    const cards = (Array.isArray(j.cards) ? j.cards : [])
      .map((c) => ({ head: String(c?.head ?? "").trim().slice(0, 40), body: String(c?.body ?? "").trim().slice(0, 200) }))
      .filter((c) => c.head && c.body)
      .slice(0, 8); // 표지+내용 8+CTA = 최대 10장(인스타 캐러셀 상한)
    if (!j.cover || cards.length < 3) return null;
    const clipRaw = j.clip as { hook?: string; lines?: unknown[]; cta?: string } | undefined;
    const clipLines = (Array.isArray(clipRaw?.lines) ? clipRaw!.lines : []).map((l) => String(l ?? "").trim().slice(0, 90)).filter(Boolean).slice(0, 10);
    return {
      cover: String(j.cover).trim().slice(0, 60),
      cards,
      cta: { head: String(j.cta?.head ?? "지금 확인").trim().slice(0, 40), body: String(j.cta?.body ?? "자세한 내용은 프로필 링크에").trim().slice(0, 200) },
      caption: String(j.caption ?? "").trim().slice(0, 1200),
      clip: clipLines.length >= 4 ? { hook: String(clipRaw?.hook ?? "").trim().slice(0, 90), lines: clipLines, cta: String(clipRaw?.cta ?? "자세한 건 블로그에 정리해뒀어요").trim().slice(0, 90) } : undefined,
    };
  } catch { return null; }
}
