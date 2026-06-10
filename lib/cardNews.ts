import Anthropic from "@anthropic-ai/sdk";

export type SlideType = "text" | "stat" | "point" | "mockup";
export type MockupKind = "generate" | "publish" | "calendar" | "edit";

export interface CardSlide {
  type: SlideType;
  title: string;
  body?: string;
  stat?: string; // 큰 숫자/한마디 (stat)
  statLabel?: string; // 숫자 밑 설명 (stat)
  points?: string[]; // 포인트 2~3개 (point)
  mockup?: MockupKind; // 제품 화면 종류 (mockup)
}
export interface CardNews {
  topic: string;
  angle: string;
  slides: CardSlide[];
  caption: string;
}

export const ANGLES = [
  { key: "money", label: "블로그 수익화 꿀팁", seed: "블로그로 돈 버는 현실적인 방법 한 가지" },
  { key: "ideas", label: "글감 아이디어", seed: "조회수 잘 나오는 블로그 글감 찾는 법" },
  { key: "mistake", label: "초보 실수", seed: "블로그 초보가 흔히 하는 치명적 실수" },
  { key: "wordpress", label: "워드프레스 팁", seed: "워드프레스 블로그 SEO 기본 세팅" },
  { key: "motivation", label: "공감·동기부여", seed: "글 한 편도 못 쓰고 미루는 사람에게" },
  { key: "fun", label: "재미·반전", seed: "AI로 블로그 글 쓰면 벌어지는 일" },
  { key: "service", label: "에이트플로 강점", seed: "키워드 하나로 블로그 글이 완성되는 경험" },
] as const;

export async function generateCardNews(topic: string, angleLabel = ""): Promise<CardNews> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("AI 설정이 아직이에요.");
  const year = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCFullYear();
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1300,
    messages: [
      {
        role: "user",
        content:
          `‘${topic}’ 주제로 인스타 카드뉴스(5장)를 만들어줘.\n` +
          "타깃: 블로그·워드프레스로 수익이나 영향력을 만들고 싶은 사람(초보~중수). 부업·N잡·애드센스 관심.\n" +
          "목표: 스크롤 멈추게(욕구·욕망 자극), 저장·팔로우하게. 우리 서비스(에이트플로: 키워드로 글 생성→워드프레스 발행)는 마지막이나 자연스러울 때만 은근하게.\n" +
          "각 슬라이드에 type을 정해 레이아웃을 다양하게:\n" +
          '  - text: {"type":"text","title":"...","body":"..."} (후크 표지·설명·CTA)\n' +
          '  - stat: {"type":"stat","title":"짧은 한 줄","stat":"월 30편","statLabel":"숫자 설명"} (임팩트 숫자/한마디)\n' +
          '  - point: {"type":"point","title":"...","points":["핵심1","핵심2","핵심3"]} (2~3개)\n' +
          '  - mockup: {"type":"mockup","title":"...","body":"...","mockup":"generate|publish|calendar|edit"} (제품 화면 예시 — 우리 서비스 보여줄 때만)\n' +
          "규칙:\n" +
          "① 1장=text 후크 표지. 5장=text 마무리(팔로우/사전등록 은근 유도). 2~4장은 내용에 맞게 stat·point·mockup·text를 섞어 변화있게.\n" +
          "② title 짧고 강하게(한두 줄). body 1~2줄. points는 각 12자 내외.\n" +
          "③ 토스처럼 간결·해요체. 슬라이드 텍스트엔 이모지 절대 금지. AI 말투·em dash(—) 금지.\n" +
          "④ 수익·방문자·상위노출 '보장' 금지(정직). 과장 X.\n" +
          `⑤ 연도 필요하면 올해(${year}년).\n` +
          "caption: 인스타 피드글. 한 덩어리로 붙이지 말고 읽기 좋게 줄바꿈(\\n)으로 문단을 나눈다. 구성:\n" +
          "  · 1줄: 스크롤 멈추는 후크(공감되는 한 줄).\n" +
          "  · 빈 줄 후 2~3줄: 카드 내용 핵심 가치·요약(한 문장씩 줄바꿈해도 좋음).\n" +
          "  · 빈 줄 후 1줄: 가벼운 CTA(저장·팔로우·프로필 링크 안내 등).\n" +
          "  · 빈 줄 후 마지막 줄에 해시태그 6~8개를 모아서.\n" +
          "  문단 사이는 빈 줄(\\n\\n)로 띄운다. 캡션 이모지는 0~2개만, 텍스트 한가운데 끼워 넣지 말고 줄 끝에 자연스럽게.\n" +
          'JSON만(줄바꿈은 \\n으로 이스케이프): {"slides":[ ... ],"caption":"..."}',
      },
    ],
  });
  const t = res.content.find((b) => b.type === "text");
  const raw = t && t.type === "text" ? t.text : "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("카드뉴스 생성 결과를 해석하지 못했어요.");
  const parsed = JSON.parse(match[0]);
  const types: SlideType[] = ["text", "stat", "point", "mockup"];
  const mockups: MockupKind[] = ["generate", "publish", "calendar", "edit"];
  const slides: CardSlide[] = Array.isArray(parsed.slides)
    ? parsed.slides
        .filter((s: unknown): s is CardSlide => !!s && typeof (s as CardSlide).title === "string")
        .slice(0, 6)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((s: any) => ({
          type: types.includes(s.type) ? s.type : "text",
          title: String(s.title).slice(0, 40),
          body: s.body ? String(s.body).slice(0, 140) : undefined,
          stat: s.stat ? String(s.stat).slice(0, 16) : undefined,
          statLabel: s.statLabel ? String(s.statLabel).slice(0, 40) : undefined,
          points: Array.isArray(s.points) ? s.points.filter((p: unknown) => typeof p === "string").slice(0, 3).map((p: string) => p.slice(0, 28)) : undefined,
          mockup: mockups.includes(s.mockup) ? s.mockup : undefined,
        }))
    : [];
  if (!slides.length) throw new Error("슬라이드가 비어 있어요.");
  const caption = typeof parsed.caption === "string" ? parsed.caption.slice(0, 2000) : topic;
  return { topic, angle: angleLabel, slides, caption };
}
