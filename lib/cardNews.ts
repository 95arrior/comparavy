import Anthropic from "@anthropic-ai/sdk";
import { logUsage } from "./usageLog";

export type SlideType = "text" | "stat" | "point" | "mockup";
export type MockupKind = "generate" | "publish" | "calendar" | "edit";

// 카드에 쓸 수 있는 아이콘(내용 이해를 돕는 심플 그래픽). 렌더러(cardRender)와 동일하게 유지.
export const ICON_NAMES = ["chart", "idea", "write", "search", "money", "check", "warn", "clock", "target", "book", "people", "tag"] as const;
export type IconName = (typeof ICON_NAMES)[number];

export interface CardSlide {
  type: SlideType;
  title: string;
  body?: string;
  stat?: string; // 큰 숫자/한마디 (stat)
  statLabel?: string; // 숫자 밑 설명 (stat)
  points?: string[]; // 포인트 2~3개 (point)
  mockup?: MockupKind; // 제품 화면 종류 (mockup)
  icon?: IconName; // 내용을 돕는 아이콘(본문 슬라이드)
  brand?: string; // AI 도구 로고 슬러그(Simple Icons: openai, googlegemini, anthropic 등) — 표지에 실제 로고
}
export interface CardNews {
  topic: string;
  angle: string;
  slides: CardSlide[];
  caption: string; // 인스타 캡션(해시태그 포함)
  threadsText: string; // 스레드 전용 글(글 중심·더 알참·해시태그 X)
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
  { key: "ainews", label: "최신 AI 소식", seed: "블로그·콘텐츠 만드는 사람에게 쓸모있는 최근 AI 소식이나 도구 하나", web: true },
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

  const useWeb = opts.useWebSearch ?? false; // 최신성 필요한 앵글만 검색(비용 절감) — 호출자가 지정
  const isHumor = angleLabel.includes("유머");
  const avoid = (opts.avoidTopics ?? []).filter(Boolean).slice(0, 15);
  const groundBlock = useWeb
    ? "먼저 웹 검색으로 이 주제의 최신·실제 정보(구체적인 방법·단계, 통용되는 사실, 최근 바뀐 점, 실제 사례)를 찾아본다. 그 근거 위에서만 카드를 쓴다. 검색으로 확인되지 않은 수치·사실·고유명사는 단정하지 말고 지어내지 않는다. 누구나 아는 뻔한 일반론 대신, 검색에서 얻은 진짜 쓸모있는 구체적 알맹이를 담는다.\n"
    : "";
  const humorBlock = isHumor
    ? "이 카드는 ‘공감 유머’다. 최근 한 달 내 유행하는 밈·말투가 지금도 통하고 블로거 정서에 자연스러우면 살짝 차용(억지·지난 밈·비하·정치·논란 금지). 타깃(블로거)이 ‘이거 내 얘기네’ 하고 웃을 포인트를 노린다.\n"
    : "";
  const avoidBlock = avoid.length ? `최근 다음 주제·표현은 이미 올렸으니 겹치지 말고 새로운 각도로: ${avoid.join(" / ")}.\n` : "";

  const model = opts.model || "claude-haiku-4-5";
  const params: Anthropic.MessageCreateParamsNonStreaming = {
    model,
    max_tokens: useWeb ? 4500 : 1500,
    ...(useWeb ? { tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }] } : {}),
    messages: [
      {
        role: "user",
        content:
          `‘${topic}’ 주제로 인스타 카드뉴스(5장)를 만들어줘.\n` +
          groundBlock +
          humorBlock +
          avoidBlock +
          "타깃: 블로그·워드프레스로 부업·수익을 만들고 싶은 사람(초보~중수). 부업·N잡·애드센스 관심.\n" +
          "목표: 첫 장(표지)에서 3초 안에 스크롤을 멈추게 하는 강한 후크로 시작한다(호기심·이득·공감·반전 중 하나를 콕 찌른다). 저장하고 팔로우하고 싶게 만든다.\n" +
          "톤: 순수하게 도움·이득·재미를 주는 콘텐츠. 서비스 홍보·판매·가입 권유 문구는 절대 넣지 않는다(지금은 신뢰·팔로우부터 쌓는 단계). 제품 목업도 쓰지 않는다.\n" +
          "각 슬라이드에 type을 정해 레이아웃을 다양하게:\n" +
          '  - text: {"type":"text","title":"...","body":"..."} (후크 표지·설명·CTA)\n' +
          '  - stat: {"type":"stat","title":"짧은 한 줄","stat":"3가지","statLabel":"숫자 설명"} (진짜 짧은 숫자·지표가 있을 때만 — 8자 이내 권장(숫자·단계·개수). 애매하거나 길면 stat 쓰지 말고 point나 text로. 긴 문장을 stat에 넣으면 안 됨)\n' +
          '  - point: {"type":"point","title":"...","points":["핵심1","핵심2","핵심3"]} (2~3개)\n' +
          '  - mockup: {"type":"mockup","title":"...","body":"...","mockup":"generate|publish|calendar|edit"} (제품 화면 예시 — 우리 서비스 보여줄 때만)\n' +
          "규칙:\n" +
          "① 1장=text 후크 표지. 표지 제목은 3초 안에 읽히게 아주 짧고 굵게(공백 빼고 16자 이내, 1~2줄). 길게 쓰면 글씨가 작아져서 안 된다 — 핵심만 쳐내라. 5장=text 마무리(저장·팔로우 유도, 서비스 홍보 문구 금지). 2~4장은 내용에 맞게 stat·point·text를 섞어 변화있게(목업은 쓰지 않음).\n" +
          "①-1 표지 후크 다양성(매우 중요). 아래 패턴은 절대 반복 금지(썸네일이 다 똑같아 보이는 주범): '왜 ~0이냐/0원이냐', '~인 이유', '~했는데 왜~', '열심히 ~했는데', '~했던 나', '조회수 0/수익 0' 류. 대신 카드마다 후크 형식을 완전히 다르게 골라라 — 호기심('아무도 안 알려주는 ~'), 구체 방법('~ 3분 만에'), 의외 사실('사실 ~는 ~예요'), 대조('A 말고 B'), 도발('아직도 ~ 하세요?'), 숫자 약속('~ 5가지'), 경고('~ 하면 큰일'), 체크리스트, 공감 유머 등. 첫 단어·문장 구조가 다른 표지와 겹치면 안 된다. 매 카드 표지를 '완전히 다른 사람이 쓴 것처럼' 다르게.\n" +
          "⑦ '막 찍어낸' 느낌 금지. 각 카드는 그 주제만의 구체적인 알맹이(실전 팁·구체 예시)를 담는다. 뻔한 일반론·다른 카드와 비슷한 재탕·빈 말 금지. 한 장 한 장 따로 공들인 것처럼.\n" +
          "⑧ 본문 슬라이드(2~4장)에만 내용을 돕는 아이콘 1개를 \"icon\"으로 넣는다(표지·마무리엔 icon 넣지 마라). 값(택1): chart, idea, write, search, money, check, warn, clock, target, book, people, tag.\n" +
          "⑨ 특정 AI 도구·서비스 소식 카드면 표지 슬라이드에 \"brand\"로 그 도구 이름을 넣어라(예: ChatGPT, Gemini, Claude, Perplexity). 그러면 표지에 그 이름이 깔끔한 배지로 들어간다(18자 이내). 일반 카드는 brand를 비운다.\n" +
          "② title 짧고 강하게. body 1~2줄. points는 각 12자 내외.\n" +
          "②-1 제목은 의미 단위로 줄바꿈(\\n)해서 자연스럽게 끊는다. 한 단어·한 글자만 다음 줄로 떨어뜨리지 말 것(예: '제휴마케/팅' 금지). 표지 제목은 3줄 이내.\n" +
          "⑥ 카드마다 후크·표현·소재를 다르게 한다. 매번 '월 100만원' 같은 똑같은 수익 후크를 반복하지 말 것. 모든 장이 돈 얘기일 필요 없다(실전 팁·공감·유머·반전도 섞기).\n" +
          "③ 토스처럼 간결·해요체. 슬라이드 텍스트엔 이모지 절대 금지. AI 말투·em dash(—) 금지.\n" +
          "④ 정직하게. 수익·방문자·상위노출 '보장' 금지, 과한 과장·100% 단정 금지. 자연스러운 수치·후크는 써도 되지만 허위로 단정하진 않는다(애매하면 '보통', '개인차 있어요' 정도로). 없는 후기·1인칭 경험은 만들지 않는다.\n" +
          `⑤ 연도 필요하면 올해(${year}년).\n` +
          "caption: 인스타 피드글. 한 덩어리로 붙이지 말고 읽기 좋게 줄바꿈(\\n)으로 문단을 나눈다. 구성:\n" +
          "  · 1줄: 스크롤 멈추는 후크(공감되는 한 줄).\n" +
          "  · 빈 줄 후 2~3줄: 카드 내용 핵심 가치·요약(한 문장씩 줄바꿈해도 좋음).\n" +
          "  · 빈 줄 후 1줄: 가벼운 CTA(‘저장해두세요’·‘팔로우하면 도움돼요’ 위주). 서비스 홍보·가입·판매 문구는 넣지 않는다.\n" +
          "  · 빈 줄 후 마지막 줄에 해시태그 6~8개를 모아서.\n" +
          "  해시태그는 매번 똑같이 쓰지 말고 주제에 맞는 특화 태그를 섞어 다양하게. 문단 사이는 빈 줄(\\n\\n)로 띄운다. 캡션 이모지는 0~2개만, 줄 끝에 자연스럽게.\n" +
          "threadsText: 스레드(Threads)용 글(인스타 캡션과 별개로, 더 알차게). 스레드는 글 중심이라 그 자체로 읽을 가치가 있어야 한다. 구성: 후크 한 줄 → 빈 줄 → 구체적이고 유익한 알맹이(카드 내용을 더 풀어 실전 팁·인사이트 2~4줄) → 빈 줄 → 가벼운 마무리(저장·팔로우나 생각 유도). 해시태그는 스레드에서 안 먹으니 넣지 마라(0개). 이모지 0~1개. 480자 이내. 대화하듯 자연스럽게, 줄바꿈으로 읽기 좋게.\n" +
          'JSON만(줄바꿈은 \\n으로 이스케이프): {"slides":[ ... ],"caption":"...","threadsText":"..."}',
      },
    ],
  };
  let res = await client.messages.create(params);
  // 웹 검색이 길어지면 stop_reason=pause_turn으로 끊김 → 이어받아 완료
  const convo: Anthropic.MessageParam[] = [...params.messages];
  let guard = 0;
  while (res.stop_reason === "pause_turn" && guard++ < 4) {
    convo.push({ role: "assistant", content: res.content });
    res = await client.messages.create({ ...params, messages: convo });
  }
  // 비용 추적 — 카드 생성도 usage_log에 기록(대시보드 월 비용 정확도)
  void logUsage({ model, kind: "card", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });

  // 웹 검색 시 content에 tool_result 블록이 섞임 → text 블록들에서 JSON 추출(마지막 → 전체 순으로 시도)
  const texts = res.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text);
  const candidates = [texts[texts.length - 1] ?? "", texts.join("\n")];
  let parsed: { slides?: unknown; caption?: unknown } | null = null;
  for (const c of candidates) {
    const m = c.match(/\{[\s\S]*\}/);
    if (!m) continue;
    try { parsed = JSON.parse(m[0]); break; } catch {}
  }
  if (!parsed) throw new Error("카드뉴스 생성 결과를 해석하지 못했어요.");
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
          icon: ICON_NAMES.includes(s.icon) ? s.icon : undefined,
          brand: typeof s.brand === "string" ? s.brand.replace(/[^A-Za-z0-9 .+-]/g, "").trim().slice(0, 18) || undefined : undefined,
        }))
    : [];
  if (!slides.length) throw new Error("슬라이드가 비어 있어요.");
  const caption = typeof parsed.caption === "string" ? parsed.caption.slice(0, 2000) : topic;
  const threadsText = typeof parsed.threadsText === "string" ? parsed.threadsText.slice(0, 490) : "";
  return { topic, angle: angleLabel, slides, caption, threadsText };
}

/**
 * 카드 품질 게이트 — 수준 낮거나 비어있는 카드를 거른다.
 * 통과(ok:false)면 큐에 넣지 않고 재생성/스킵한다.
 */
export function assessCard(card: CardNews): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const slides = card.slides;
  if (slides.length < 4) reasons.push("슬라이드 4장 미만");

  // 표지 제목 길이 — 너무 짧아도, 너무 길어도(글씨 작아짐) 거른다
  const cover = (slides[0]?.title ?? "").replace(/\s|\n/g, "");
  if (cover.length < 4) reasons.push("표지 제목이 너무 짧음");
  if (cover.length > 20) reasons.push("표지 제목이 너무 김(고정 크기라 20자 이내로)");

  // 제목 중복
  const titles = slides.map((s) => s.title.replace(/\s+/g, "").toLowerCase());
  if (new Set(titles).size < titles.length) reasons.push("슬라이드 제목 중복");

  // 타입별 필수 데이터
  for (const s of slides) {
    if (s.type === "stat" && !s.stat) reasons.push("stat 슬라이드에 숫자 없음");
    if (s.type === "stat" && s.stat && [...s.stat].length > 12) reasons.push("stat이 너무 김(12자 이내)");
    if (s.type === "point" && (!s.points || s.points.length < 2)) reasons.push("point 슬라이드 항목 부족");
    if (s.type === "mockup" && !s.mockup) reasons.push("mockup 종류 없음");
  }

  // 캡션·해시태그
  const cap = card.caption ?? "";
  if (cap.length < 50) reasons.push("캡션이 너무 짧음");
  const hashtags = (cap.match(/#[^\s#]+/g) ?? []).length;
  if (hashtags < 4) reasons.push("해시태그 4개 미만");

  // 금지: em dash, 과장/보장 표현
  const slidesText = slides.map((s) => `${s.title} ${s.body ?? ""} ${s.stat ?? ""} ${s.statLabel ?? ""} ${(s.points ?? []).join(" ")}`).join(" ");
  const all = slidesText + " " + cap;
  if (/[—–]/.test(all)) reasons.push("em dash 사용");
  // 오바(허위 보장)만 차단 — 자연스러운 수치·표현은 허용
  if (/(보장|무조건 1위|상위노출 보장|100% )/.test(all)) reasons.push("과장·보장 표현");

  return { ok: reasons.length === 0, reasons };
}
