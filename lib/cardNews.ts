import Anthropic from "@anthropic-ai/sdk";

export interface CardSlide {
  title: string;
  body: string;
}
export interface CardNews {
  slides: CardSlide[]; // 표지 + 본문들 (4~6장)
  caption: string; // 인스타 캡션(해시태그 포함)
}

/**
 * 주제를 받아 인스타 카드뉴스 카피를 생성한다. (haiku, 짧고 구조적이라 저비용)
 * 톤: 블로그 수익화 초보 타깃, 토스풍 간결·정직(과장·방문자 보장 금지).
 */
export async function generateCardNews(topic: string): Promise<CardNews> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("AI 설정이 아직이에요.");
  const year = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCFullYear();
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 900,
    messages: [
      {
        role: "user",
        content:
          `‘${topic}’ 주제로 인스타 카드뉴스를 만들어줘. 타깃은 워드프레스 블로그로 수익 내고 싶은 초보.\n` +
          "규칙: ① 슬라이드 5장(1장=표지 후크, 2~4장=핵심 팁, 5장=마무리+행동유도) ② 각 슬라이드 title은 8자 내외 짧게, body는 2줄 이내 ③ 토스처럼 간결·사람 말투(해요체) ④ 방문자·수익 '보장'은 절대 금지(정직) ⑤ AI 말투·이모지 남발 금지 ⑥ 연도 필요하면 올해(" + year + "년).\n" +
          "caption은 인스타용 2~4문장 + 관련 해시태그 5개(#블로그 #워드프레스 등).\n" +
          'JSON만 출력: {"slides":[{"title":"...","body":"..."}],"caption":"..."}',
      },
    ],
  });
  const t = res.content.find((b) => b.type === "text");
  const raw = t && t.type === "text" ? t.text : "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("카드뉴스 생성 결과를 해석하지 못했어요.");
  const parsed = JSON.parse(match[0]);
  const slides: CardSlide[] = Array.isArray(parsed.slides)
    ? parsed.slides
        .filter((s: unknown): s is CardSlide => !!s && typeof (s as CardSlide).title === "string")
        .map((s: CardSlide) => ({ title: String(s.title).slice(0, 30), body: String(s.body ?? "").slice(0, 120) }))
        .slice(0, 6)
    : [];
  if (!slides.length) throw new Error("슬라이드가 비어 있어요.");
  const caption = typeof parsed.caption === "string" ? parsed.caption.slice(0, 2000) : topic;
  return { slides, caption };
}
