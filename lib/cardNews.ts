import Anthropic from "@anthropic-ai/sdk";

export interface CardSlide {
  title: string;
  body: string;
}
export interface CardNews {
  topic: string;
  angle: string;
  slides: CardSlide[]; // 표지 + 본문들 (5장)
  caption: string; // 인스타 캡션(해시태그 포함)
}

/** 카드뉴스 앵글(유형) — 다양하게 굴려서 팔로워·유입 늘리기. */
export const ANGLES = [
  { key: "money", label: "블로그 수익화 꿀팁", seed: "블로그로 돈 버는 현실적인 방법 한 가지" },
  { key: "ideas", label: "글감 아이디어", seed: "조회수 잘 나오는 블로그 글감 찾는 법" },
  { key: "mistake", label: "초보 실수", seed: "블로그 초보가 흔히 하는 치명적 실수" },
  { key: "wordpress", label: "워드프레스 팁", seed: "워드프레스 블로그 SEO 기본 세팅" },
  { key: "motivation", label: "공감·동기부여", seed: "글 한 편도 못 쓰고 미루는 사람에게" },
  { key: "fun", label: "재미·반전", seed: "AI로 블로그 글 쓰면 벌어지는 일" },
  { key: "service", label: "에이트플로 강점", seed: "키워드 하나로 블로그 글이 완성되는 경험" },
] as const;

/**
 * 주제로 인스타 카드뉴스 카피 생성. 블로그/워드프레스로 수익·영향력 만들고 싶은 사람 타깃.
 * 욕구·욕망 자극 + 다양(수익화·아이디어·실수·재미·동기부여·서비스 장점) + 정직(수익·방문자 보장 금지).
 */
export async function generateCardNews(topic: string, angleLabel = ""): Promise<CardNews> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("AI 설정이 아직이에요.");
  const year = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCFullYear();
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1100,
    messages: [
      {
        role: "user",
        content:
          `‘${topic}’ 주제로 인스타 카드뉴스(5장)를 만들어줘.\n` +
          "타깃: 블로그·워드프레스로 수익이나 영향력을 만들고 싶은 사람(초보~중수). 부업·N잡·애드센스에 관심 많음.\n" +
          "목표: 스크롤을 멈추게 하고(욕구·욕망 자극), 저장·팔로우하게. 우리 서비스(에이트플로: 키워드로 글 생성→워드프레스 발행)는 마지막에 은근하게 또는 자연스러울 때만.\n" +
          "규칙:\n" +
          "① 1장=강한 후크 표지(궁금증·이득·공감 중 하나). 2~4장=핵심 내용. 5장=마무리 + 팔로우/사전등록 유도(은근).\n" +
          "② title은 한두 줄, 짧고 강하게. body는 1~2줄.\n" +
          "③ 토스처럼 간결·사람 말투(해요체). 슬라이드 title·body에는 이모지 절대 금지(깔끔하게). AI 말투(‘알아보겠습니다’ 등)·em dash(—)도 금지.\n" +
          "④ 수익·방문자·상위노출 '보장' 절대 금지(정직). 과장 X.\n" +
          `⑤ 연도 필요하면 올해(${year}년).\n` +
          "caption: 인스타용 2~4문장(공감→가치→가벼운 CTA) + 해시태그 6~8개(#블로그 #블로그수익화 #워드프레스 #애드센스 #부업 #N잡 등 주제에 맞게). 캡션 이모지는 써도 0~2개만.\n" +
          'JSON만: {"slides":[{"title":"...","body":"..."}],"caption":"..."}',
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
        .map((s: CardSlide) => ({ title: String(s.title).slice(0, 40), body: String(s.body ?? "").slice(0, 140) }))
        .slice(0, 6)
    : [];
  if (!slides.length) throw new Error("슬라이드가 비어 있어요.");
  const caption = typeof parsed.caption === "string" ? parsed.caption.slice(0, 2000) : topic;
  return { topic, angle: angleLabel, slides, caption };
}
