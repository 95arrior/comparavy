// ★인스타 카드뉴스 압축(2026-08-11 유저: "네이버만 올리는 게 아깝다 — 한 글감을 인스타용으로도").
//
//  구조: 완성된(팩트 크로스체크 통과한) 블로그 글을 카드뉴스 문구로 압축한다 — 새 사실 생성 금지, 압축만.
//  그래서 인스타 버전도 본문과 같은 신뢰도를 갖는다. 이미지는 유저가 직접 구한다(문구만 만든다).
//  ★표지는 홈판 썸네일 문법(유저 지시: "결핍을 긁거나 돈으로 유혹") — 검색이 아니라 피드 판이라 대중 훅이 무기다.
//  ★장수는 6~10 가변(유저 '제한 없이' 요청에 상한을 되돌려 제안·승인 — 인스타 캐러셀 기술 상한 10장, 완독은 6~8장).

import Anthropic from "@anthropic-ai/sdk";
import { logUsage } from "./usageLog";

export interface InstaCard { head: string; body: string }
export interface ClipSegment { say: string; motion: string }
export interface ClipScript { hook: string; segments: ClipSegment[]; styleAnchor: string; cta: string }
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
        "[클립 clip] 네이버 클립용 — 캐릭터가 '키워드 그 자체'가 되어 가르치듯 말한다(2026-08-11 유저 확정 규격·예시):",
        "  hook = 의인화 오프닝: '나 {키워드 핵심}인데! {가장 충격적인 돈 팩트 한 문장}! 지금부터 빠르게 알려줄게! 잘 들어!' 결 — 유저 실례: '나 레버리지인데! 주식 1억 있어도 현금 3천만원 없으면 이제 못 산대!'",
        "  segments = 4~5개(★6개 미만 엄수 — 유저: '리스트가 너무 많고 짧아, 붙여서 10초짜리로'). 각 세그 say = 10초 분량(2~3문장을 붙인 60~90자, 재밌게 누굴 가르치듯 '~거든요/~해요/~해 보세요', 한 세그에 관련 정보 2~3개 묶기). 마지막 세그는 행동 지시('지금 계좌 현금 확인해 보세요' + '자세한 계산은 블로그에 정리해 뒀어요').",
        "  각 세그 motion = 그 컷의 이미지-투-비디오 모션 프롬프트(영어 1~2문장): 유저가 만든 고정 캐릭터 이미지가 이 컷에서 취할 동작·표정·카메라만 짧게. 예: 'The character leans in and points at the viewer with a warning face, subtle push-in.' 배경·스타일 묘사 금지(styleAnchor가 담당).",
        "  styleAnchor = 모든 컷 앞에 붙일 공통 프롬프트(영어 1문장): 같은 캐릭터·같은 톤 유지 지시. 예: 'Same character as the reference image, consistent outfit and proportions, clean studio background, subtle 2D cartoon motion.'",
        "  cta = 마무리 대사: '블로그 링크에서 최신 기준 확인하고 거래 증권사에도 물어봐야 정확해요' 결. 대사 전부 글에 있는 사실만.",
        "",
        '출력 JSON만: {"cover":"...","cards":[{"head":"...","body":"..."}],"cta":{"head":"...","body":"..."},"caption":"...","clip":{"hook":"...","styleAnchor":"...","segments":[{"say":"...","motion":"..."}],"cta":"..."}}',
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
    const clipRaw = j.clip as { hook?: string; styleAnchor?: string; segments?: { say?: string; motion?: string }[]; cta?: string } | undefined;
    const segments = (Array.isArray(clipRaw?.segments) ? clipRaw!.segments : [])
      .map((g) => ({ say: String(g?.say ?? "").trim().slice(0, 160), motion: String(g?.motion ?? "").trim().slice(0, 220) }))
      .filter((g) => g.say)
      .slice(0, 5); // ★6개 미만(유저 확정)
    return {
      cover: String(j.cover).trim().slice(0, 60),
      cards,
      cta: { head: String(j.cta?.head ?? "지금 확인").trim().slice(0, 40), body: String(j.cta?.body ?? "자세한 내용은 프로필 링크에").trim().slice(0, 200) },
      caption: String(j.caption ?? "").trim().slice(0, 1200),
      clip: segments.length >= 3 ? { hook: String(clipRaw?.hook ?? "").trim().slice(0, 160), segments, styleAnchor: String(clipRaw?.styleAnchor ?? "Same character as the reference image, consistent outfit and proportions, subtle 2D cartoon motion.").trim().slice(0, 220), cta: String(clipRaw?.cta ?? "블로그 링크에서 최신 기준 확인하고 거래 증권사에도 물어봐야 정확해요").trim().slice(0, 160) } : undefined,
    };
  } catch { return null; }
}
