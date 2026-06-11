import Anthropic from "@anthropic-ai/sdk";
import { logUsage } from "./usageLog";

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

export interface Angle {
  key: string;
  label: string;
  seed: string;
  /** 최근 밈·트렌드를 웹 검색해 반영하는 앵글(공감 유머) */
  web?: boolean;
  /** 서비스 홍보성 앵글 — 초반엔 벌크 로테이션에서 제외 */
  promo?: boolean;
}

export const ANGLES: Angle[] = [
  { key: "money", label: "부업·수익화", seed: "블로그로 부업 수익 만드는 현실적인 방법 한 가지" },
  { key: "monetize", label: "수익화 깨알팁", seed: "애드센스·제휴로 블로그 수익 올리는 깨알 팁" },
  { key: "ideas", label: "글감 아이디어", seed: "조회수 잘 나오는 블로그 글감 찾는 법" },
  { key: "mistake", label: "초보 실수", seed: "블로그 초보가 흔히 하는 치명적 실수" },
  { key: "wordpress", label: "워드프레스 깨알지식", seed: "워드프레스 초보가 모르면 손해 보는 깨알 지식" },
  { key: "beginner", label: "초보 입문", seed: "블로그 처음 시작하는 사람을 위한 기본기 하나" },
  { key: "humor", label: "공감 유머", seed: "블로그·워드프레스 운영자라면 공감할 현실 유머", web: true },
  { key: "service", label: "에이트플로 강점", seed: "키워드 하나로 블로그 글이 완성되는 경험", promo: true },
];

export interface GenerateOpts {
  /** 최근에 다룬 주제들(중복 방지용) */
  avoidTopics?: string[];
  /** 최근 밈·트렌드를 웹 검색해 반영(공감 유머 앵글) */
  useWebSearch?: boolean;
  /** 모델 오버라이드 (기본 haiku, 유머는 sonnet 권장) */
  model?: string;
}

export async function generateCardNews(topic: string, angleLabel = "", opts: GenerateOpts = {}): Promise<CardNews> {
  // SNS 전용 키가 있으면 그걸로(예산·한도 분리), 없으면 메인 키로 폴백.
  const apiKey = process.env.ANTHROPIC_SOCIAL_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("AI 설정이 아직이에요.");
  const year = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCFullYear();
  const client = new Anthropic({ apiKey });

  const avoid = (opts.avoidTopics ?? []).filter(Boolean).slice(0, 15);
  const humorBlock = opts.useWebSearch
    ? "이 카드는 ‘공감 유머’다. 웹 검색으로 최근 한 달 이내 한국에서 실제 유행 중인 밈·말투·트렌드를 찾아보고, 지금도 확실히 통하고 블로그·워드프레스 운영자 정서에 자연스럽게 맞을 때만 살짝 차용한다. 한참 지난 밈·억지 밈·맥락 안 맞는 밈은 절대 쓰지 말고, 그럴 땐 유행 안 타는 담백한 공감 유머로 간다. 비하·정치·논란·저질 소재 금지. 그래도 우리 타깃(블로거)이 ‘이거 내 얘기네’ 하고 웃을 포인트를 노린다.\n"
    : "";
  const avoidBlock = avoid.length ? `최근 다음 주제·표현은 이미 올렸으니 겹치지 말고 새로운 각도로: ${avoid.join(" / ")}.\n` : "";

  const res = await client.messages.create({
    model: opts.model || "claude-haiku-4-5",
    max_tokens: opts.useWebSearch ? 2200 : 1300,
    ...(opts.useWebSearch ? { tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }] } : {}),
    messages: [
      {
        role: "user",
        content:
          `‘${topic}’ 주제로 인스타 카드뉴스(5장)를 만들어줘.\n` +
          humorBlock +
          avoidBlock +
          "타깃: 블로그·워드프레스로 부업·수익을 만들고 싶은 사람(초보~중수). 부업·N잡·애드센스 관심.\n" +
          "목표: 첫 장(표지)에서 3초 안에 스크롤을 멈추게 하는 강한 후크로 시작한다(호기심·이득·공감·반전 중 하나를 콕 찌른다). 저장하고 팔로우하고 싶게 만든다.\n" +
          "톤: 순수하게 도움·이득·재미를 주는 콘텐츠. 서비스 홍보·판매·가입 권유 문구는 절대 넣지 않는다(지금은 신뢰·팔로우부터 쌓는 단계). 제품 목업도 쓰지 않는다.\n" +
          "각 슬라이드에 type을 정해 레이아웃을 다양하게:\n" +
          '  - text: {"type":"text","title":"...","body":"..."} (후크 표지·설명·CTA)\n' +
          '  - stat: {"type":"stat","title":"짧은 한 줄","stat":"월 100만원","statLabel":"숫자 설명"} (임팩트 숫자/짧은 지표만 — 숫자나 7자 이내 짧은 말. "제휴마케팅"처럼 긴 단어·개념은 stat 금지, 그런 건 point/text로)\n' +
          '  - point: {"type":"point","title":"...","points":["핵심1","핵심2","핵심3"]} (2~3개)\n' +
          '  - mockup: {"type":"mockup","title":"...","body":"...","mockup":"generate|publish|calendar|edit"} (제품 화면 예시 — 우리 서비스 보여줄 때만)\n' +
          "규칙:\n" +
          "① 1장=text 후크 표지(3초 안에 멈추게 하는 한 줄 — 길게 설명 말고 짧고 강하게). 5장=text 마무리(저장·팔로우 유도, 서비스 홍보 문구 금지). 2~4장은 내용에 맞게 stat·point·text를 섞어 변화있게(목업은 쓰지 않음).\n" +
          "② title 짧고 강하게. body 1~2줄. points는 각 12자 내외.\n" +
          "②-1 제목은 의미 단위로 줄바꿈(\\n)해서 자연스럽게 끊는다. 한 단어·한 글자만 다음 줄로 떨어뜨리지 말 것(예: '제휴마케/팅' 금지). 표지 제목은 3줄 이내.\n" +
          "⑥ 카드마다 후크·표현·소재를 다르게 한다. 매번 '월 100만원' 같은 똑같은 수익 후크를 반복하지 말 것. 모든 장이 돈 얘기일 필요 없다(실전 팁·공감·유머·반전도 섞기).\n" +
          "③ 토스처럼 간결·해요체. 슬라이드 텍스트엔 이모지 절대 금지. AI 말투·em dash(—) 금지.\n" +
          "④ 수익·방문자·상위노출 '보장' 금지(정직). 과장 X.\n" +
          `⑤ 연도 필요하면 올해(${year}년).\n` +
          "caption: 인스타 피드글. 한 덩어리로 붙이지 말고 읽기 좋게 줄바꿈(\\n)으로 문단을 나눈다. 구성:\n" +
          "  · 1줄: 스크롤 멈추는 후크(공감되는 한 줄).\n" +
          "  · 빈 줄 후 2~3줄: 카드 내용 핵심 가치·요약(한 문장씩 줄바꿈해도 좋음).\n" +
          "  · 빈 줄 후 1줄: 가벼운 CTA(‘저장해두세요’·‘팔로우하면 도움돼요’ 위주). 서비스 홍보·가입·판매 문구는 넣지 않는다.\n" +
          "  · 빈 줄 후 마지막 줄에 해시태그 6~8개를 모아서.\n" +
          "  해시태그는 매번 똑같이 쓰지 말고 주제에 맞는 특화 태그를 섞어 다양하게. 문단 사이는 빈 줄(\\n\\n)로 띄운다. 캡션 이모지는 0~2개만, 줄 끝에 자연스럽게.\n" +
          'JSON만(줄바꿈은 \\n으로 이스케이프): {"slides":[ ... ],"caption":"..."}',
      },
    ],
  });
  // 비용 추적 — 카드 생성도 usage_log에 기록(대시보드 월 비용 정확도)
  void logUsage({ model: opts.model || "claude-haiku-4-5", kind: "card", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });

  // 웹 검색 시 content에 tool_result 블록이 섞이므로 마지막 text 블록을 쓴다
  const texts = res.content.filter((b) => b.type === "text");
  const raw = texts.length ? (texts[texts.length - 1] as { text: string }).text : "";
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

/**
 * 카드 품질 게이트 — 수준 낮거나 비어있는 카드를 거른다.
 * 통과(ok:false)면 큐에 넣지 않고 재생성/스킵한다.
 */
export function assessCard(card: CardNews): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const slides = card.slides;
  if (slides.length < 4) reasons.push("슬라이드 4장 미만");

  // 표지 제목 길이
  const cover = slides[0]?.title?.trim() ?? "";
  if (cover.length < 4) reasons.push("표지 제목이 너무 짧음");

  // 제목 중복
  const titles = slides.map((s) => s.title.replace(/\s+/g, "").toLowerCase());
  if (new Set(titles).size < titles.length) reasons.push("슬라이드 제목 중복");

  // 타입별 필수 데이터
  for (const s of slides) {
    if (s.type === "stat" && !s.stat) reasons.push("stat 슬라이드에 숫자 없음");
    if (s.type === "point" && (!s.points || s.points.length < 2)) reasons.push("point 슬라이드 항목 부족");
    if (s.type === "mockup" && !s.mockup) reasons.push("mockup 종류 없음");
  }

  // 캡션·해시태그
  const cap = card.caption ?? "";
  if (cap.length < 50) reasons.push("캡션이 너무 짧음");
  const hashtags = (cap.match(/#[^\s#]+/g) ?? []).length;
  if (hashtags < 4) reasons.push("해시태그 4개 미만");

  // 금지: em dash, 과장/보장 표현
  const all = slides.map((s) => `${s.title} ${s.body ?? ""} ${(s.points ?? []).join(" ")}`).join(" ") + " " + cap;
  if (/[—–]/.test(all)) reasons.push("em dash 사용");
  if (/(보장|무조건|확실히 1위|상위노출 보장)/.test(all)) reasons.push("과장·보장 표현");

  return { ok: reasons.length === 0, reasons };
}
