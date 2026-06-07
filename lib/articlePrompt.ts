// 한국어 SEO 글 생성 프롬프트 정의.
// 출력 언어는 항상 한국어. 한국 구글 검색 의도에 맞춘 글을 만든다.

export interface OptionMeta {
  key: string;
  label: string;
  hint: string;
}

export const ARTICLE_TYPES: OptionMeta[] = [
  { key: "howto", label: "정보형 · 하우투", hint: "방법·절차를 단계별로 설명하는 실용 가이드" },
  { key: "listicle", label: "리스트형", hint: "추천·정리 목록 (예: 5가지 방법, 추천 7선)" },
  { key: "comparison", label: "비교 · 리뷰", hint: "선택지를 비교하거나 장단점을 평가" },
  { key: "trend", label: "트렌드 · 이슈", hint: "최근 흐름·변화를 다루는 시의성 있는 글" },
];

export const TONES: OptionMeta[] = [
  { key: "friendly", label: "친근한", hint: "편안하고 대화하듯, 그러나 군더더기 없이" },
  { key: "professional", label: "전문적인", hint: "신뢰감 있고 정제된, 근거 중심의 문체" },
  { key: "persuasive", label: "설득력 있는", hint: "분명한 관점으로 독자를 설득하는 문체" },
  { key: "informative", label: "객관적인", hint: "감정을 빼고 사실과 정보 위주로" },
];

export const TYPE_INSTRUCTIONS: Record<string, string> = {
  howto:
    "독자가 따라 하면 실제로 끝낼 수 있도록 구체적인 단계로 구성한다. 각 단계는 명령형으로 명확하게. 막연한 일반론 대신 실제로 무엇을 누르고 입력하는지 쓴다.",
  listicle:
    "항목마다 왜 추천하는지, 누구에게 맞는지, 주의할 점은 무엇인지 한 가지씩 분명한 정보를 담는다. 항목 간 내용이 겹치지 않게 한다.",
  comparison:
    "비교 기준을 먼저 세우고, 각 선택지의 장단점을 균형 있게 다룬다. 마지막에 '이런 사람에게는 이것'처럼 상황별 추천으로 정리한다.",
  trend:
    "무엇이, 왜 지금 바뀌고 있는지를 설명한다. 단순 속보가 아니라 독자가 알아야 할 맥락과 영향을 짚는다.",
};

export const TONE_INSTRUCTIONS: Record<string, string> = {
  friendly: "친근하지만 가볍지 않게. 독자를 '여러분'이라 부르지 말고 자연스럽게 '~하면 됩니다' 정도로.",
  professional: "전문적이고 정제된 문체. 근거 없이 단정하지 말고, 과장된 수식어를 피한다.",
  persuasive: "분명한 관점을 가지고 주장한다. 다만 사실을 왜곡하거나 없는 근거를 만들지 않는다.",
  informative: "감정·홍보 표현을 빼고 사실과 정보 위주로. 중립적이되 지루하지 않게.",
};

// 한국어 AI 글의 전형적인 상투어 — 사용 금지.
export const KOREAN_CLICHES: string[] = [
  "오늘은",
  "여러분",
  "결론적으로",
  "알아보겠습니다",
  "알아보도록 하겠습니다",
  "살펴보겠습니다",
  "함께 살펴보",
  "지금부터",
  "마치며",
  "어떠셨나요",
  "도움이 되셨길",
  "포스팅을 마치겠습니다",
  "정리해 보면",
  "다양한",
  "바쁜 현대인",
];

export interface ArticlePromptInput {
  keyword: string;
  angle?: string;
  type: string;
  tone: string;
  /** 목표 글자수 (한국어 기준) */
  maxWords: number;
}

export function buildSystemPrompt(): string {
  return [
    "당신은 한국어로 글을 쓰는 숙련된 SEO 콘텐츠 작가입니다.",
    "당신의 글은 한국 구글 검색에서 노출되고, 사람이 직접 쓴 것처럼 읽혀야 합니다.",
    "",
    "반드시 지킬 규칙:",
    "1) 모든 출력은 한국어로 작성한다 (제목, 본문, 소제목, FAQ, 메타 포함).",
    "2) 정직함이 최우선. 가짜 통계·수치, 지어낸 후기·인용, 없는 1인칭 경험을 만들지 않는다. 모르면 일반적인 표현으로 쓴다.",
    "3) 아래의 한국어 AI 상투어를 절대 쓰지 않는다: " + KOREAN_CLICHES.join(", ") + ".",
    "4) 번역투(예: '~에 다름 아니다', '~할 필요가 있다'의 남용)와 기계적인 문장을 피한다. 문장 길이를 자연스럽게 변주한다.",
    "5) 키워드를 억지로 반복하지 말고 자연스럽게 녹인다. 연관 검색어(LSI)를 한국어 기준으로 적절히 포함한다.",
    "6) 깔끔한 HTML로 본문을 작성한다: <h2>, <h3>, <p>, <ul>/<li>만 사용하고 인라인 스타일은 쓰지 않는다.",
  ].join("\n");
}

export function buildUserPrompt(input: ArticlePromptInput): string {
  const typeInstruction = TYPE_INSTRUCTIONS[input.type] ?? "";
  const toneInstruction = TONE_INSTRUCTIONS[input.tone] ?? "";

  return [
    `핵심 키워드: ${input.keyword}`,
    input.angle ? `글의 관점/각도: ${input.angle}` : "",
    "",
    `글 유형 지침: ${typeInstruction}`,
    `문체 지침: ${toneInstruction}`,
    "",
    `목표 분량: 약 ${input.maxWords.toLocaleString()}자 (공백 제외 한국어 글자수 기준). 너무 짧으면 안 된다.`,
    "",
    "구조: 도입(상투어 없이 바로 핵심) → 본문(<h2> 소제목 여러 개, 필요 시 <h3>·목록) → 자주 묻는 질문(FAQ) 3~5개 → 짧은 마무리.",
    "도입을 '오늘은', '~에 대해 알아보겠습니다' 같은 표현으로 시작하지 말 것.",
    "",
    "결과는 반드시 제공된 도구(save_article)를 호출해 구조화된 형태로 제출한다.",
  ]
    .filter(Boolean)
    .join("\n");
}
