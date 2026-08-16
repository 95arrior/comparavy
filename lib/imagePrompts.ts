// ★이미지 프롬프트 v2(2026-08-17 유저 확정 공식 전면 반영 — 한국어 템플릿).
//  대원칙: 썸네일은 '경제 주제'가 아니라 '경제 때문에 벌어진 생활 장면'을 그린다(내 돈에 생긴 일).
//  본문 이미지는 후킹이 아니라 독서 보조다 — 둘을 같은 프롬프트로 만들면 안 된다.

export type ImageLane = "home" | "search";
export type BodyImageRole = "scene" | "evidence" | "explain" | "rest";

// 주제군별 기본 필드(persona·action·emotion·소품 2개) — 키워드에서 자동 채움
const TOPIC_PROFILES: [RegExp, { persona: string; action: string; emotion: string; props: [string, string] }][] = [
  [/(예산|일정|마감|타이밍|시기|접수|신청 기간)/, { persona: "한국의 30~40대 직장인", action: "달력 메모와 휴대폰을 번갈아 보며 일정을 확인하는", emotion: "'언제 챙겨야 하지?'라는 긴장과 당황", props: ["일정 체크가 된 달력 메모", "스마트폰"] }],
  [/(예금|적금|금리|이자|통장)/, { persona: "한국의 30~50대 생활자", action: "통장이나 예금 문서를 보고 표정이 굳는", emotion: "'생각보다 적네'라는 실망과 놀람", props: ["통장", "계산기"] }],
  [/(청약|분양|아파트|부동산|전세|월세)/, { persona: "한국의 30~40대 직장인 또는 신혼부부", action: "청약 서류 봉투와 휴대폰을 확인하는", emotion: "'기회를 놓치면 안 된다'는 긴장감", props: ["서류 봉투", "휴대폰"] }],
  [/(세금|고지서|납부|주민세|국세|공과금|전기요금|관리비)/, { persona: "한국의 생활자", action: "식탁 위 고지서를 보고 눈이 커지는", emotion: "'돈이 더 나가네'라는 놀람과 부담감", props: ["고지서", "펜"] }],
  [/(연금|월급|급여|보험료|국민연금|실수령)/, { persona: "한국의 30~40대 직장인", action: "급여명세서를 확인하며 멈칫하는", emotion: "'월급에서 또 빠지네'라는 손해 느낌", props: ["급여명세서", "휴대폰"] }],
  [/(물가|생활비|장보기|배달|카드값|소비)/, { persona: "한국의 30~50대 생활자", action: "계산대 앞이나 가계부 앞에서 지갑 사정을 확인하는", emotion: "'체감이 다르네'라는 놀람", props: ["가계부 또는 영수증", "지갑"] }],
  [/(지원금|환급|보조금|혜택)/, { persona: "한국의 30~40대 생활자", action: "휴대폰 알림을 보고 반색하며 서두르는", emotion: "'나도 받을 수 있나?'라는 기대와 조급함", props: ["휴대폰", "메모지"] }],
];

const DEFAULT_PROFILE = { persona: "한국의 30~50대 생활자", action: "휴대폰과 문서를 번갈아 확인하는", emotion: "놀람과 긴장 중 하나만 분명하게", props: ["휴대폰", "문서"] as [string, string] };

function profileFor(text: string) {
  for (const [re, p] of TOPIC_PROFILES) if (re.test(text)) return p;
  return DEFAULT_PROFILE;
}

// ★금지 규칙(유저 확정 10종) — 모든 썸네일 프롬프트 꼬리에 붙는다
const THUMB_BAN = "차트, 그래프, 건물 전경 단독, 돈다발 중심 구도는 피하고, 소품은 2개를 넘기지 않는다. 배경 복잡·무표정 인물·작은 피사체·경제 기사 삽화 같은 느낌 금지. 이미지 안에 글자·숫자·로고를 넣지 않는다.";

/** 썸네일 — 클릭을 받는 것. 0.5초 안에 감정이 읽히는 '내 돈에 생긴 일' 장면. */
export function buildThumbImagePrompt(keyword: string, scene?: string | null, lane: ImageLane = "home"): string {
  const p = profileFor(keyword);
  const laneTone = lane === "search"
    ? "검색형 정보글 썸네일이므로 과한 감정보다 주제와 상황이 명확하게 전달되도록."
    : "모바일 피드에서 스크롤을 멈추게 하는 강한 생활경제 장면으로, 감정이 즉시 읽히게.";
  return [
    "부드러운 파스텔 톤의 깔끔한 2D 일러스트.",
    scene?.trim()
      ? `${scene.trim()} 장면을 상반신 위주로 크게 보여준다.`
      : `${p.persona} 1명이 ${p.action} 장면을 상반신 위주로 크게 보여준다.`,
    `감정은 ${p.emotion} — 하나만 분명하게.`,
    `소품은 ${p.props[0]}, ${p.props[1]}까지만.`,
    `경제 뉴스나 제도 자체보다 '${keyword}' 때문에 벌어진 생활 장면이 보이게.`,
    "배경은 매우 단순하고 정리된 형태, 주인공이 중앙 70% 안에 들어오게.",
    "모바일 썸네일에서 얼굴, 손, 소품이 작게 보이지 않도록 상반신 중심 클로즈업.",
    "하단 또는 한쪽에 짧은 한국어 문구를 나중에 올릴 수 있도록 충분한 여백을 남긴다.",
    laneTone,
    THUMB_BAN,
    "모바일 블로그 썸네일 용도이므로 작은 크기에서도 감정과 핵심 장면이 즉시 읽히게.",
  ].join(" ");
}

// 본문 역할 자동 판별 — 슬롯 설명에서 유추(SCENE/EVIDENCE/EXPLAIN/REST)
export function inferBodyRole(sceneDesc: string): BodyImageRole {
  const t = String(sceneDesc ?? "");
  if (/(서류|절차|신청|도장|접수|준비물|달력|일정|캘린더|마감)/.test(t)) return "explain";
  if (/(표|자료|캡처|공고|공식|근거|화면)/.test(t)) return "evidence";
  if (/(휴식|분위기|정리|마무리)/.test(t)) return "rest";
  return "scene";
}

const ROLE_LINE: Record<BodyImageRole, string> = {
  scene: "이 이미지는 본문 속 생활 장면(분위기 환기·체감 전달) 역할이다.",
  evidence: "이 이미지는 본문 속 근거 보조 역할이다 — 실제 자료를 떠올리게 하되 글자는 넣지 않는다.",
  explain: "이 이미지는 본문 속 절차·개념 설명 보조 역할이다 — 서류·달력·통장 같은 개념적 장면으로.",
  rest: "이 이미지는 긴 텍스트 사이 쉬어가는 환기 역할이다 — 차분하고 정돈된 장면으로.",
};

/** 본문 — 읽는 흐름을 돕는 것. 썸네일보다 감정이 약해야 한다. */
export function buildBodyImagePrompt(sceneDesc: string, keyword: string, role?: BodyImageRole): string {
  void keyword;
  const r = role ?? inferBodyRole(sceneDesc);
  return [
    "깔끔하고 부드러운 2D 일러스트.",
    `${sceneDesc.trim()} 장면을 보여준다.`,
    "한국의 생활경제/직장인 맥락에 어울리게, 과한 표정이나 과장된 연출은 줄이고 본문 내용을 보조하는 자연스러운 장면으로 표현.",
    ROLE_LINE[r],
    "배경은 단순하되 썸네일보다는 조금 더 문맥이 느껴지게. 소품은 3개 이내.",
    "정보글 본문에 들어갈 이미지이므로 설명을 방해하지 않도록 차분하고 정돈된 분위기.",
    "텍스트가 없어도 의미가 전달되게 — 이미지 안에 글자·숫자·로고 금지.",
    "너무 광고 같거나 자극적인 구도는 피한다.",
  ].join(" ");
}
