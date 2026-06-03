export type BusinessTypeCategory =
  | "education"
  | "beauty"
  | "fitness"
  | "pet"
  | "food"
  | "home-service"
  | "clinic"
  | "online-service"
  | "fallback";

export type ChannelCategory =
  | "naver-place"
  | "instagram"
  | "blog"
  | "kakao-channel"
  | "homepage"
  | "referral"
  | "offline"
  | "none"
  | "unsure";

export type GoalCategory =
  | "inquiry"
  | "booking"
  | "purchase"
  | "trust"
  | "event"
  | "acquisition"
  | "revisit"
  | "service-copy"
  | "pricing"
  | "content"
  | "exposure"
  | "faq"
  | "unsure";

export type LocalContext = "local" | "online" | "unsure";

export interface DiagnosisContext {
  readonly businessType: BusinessTypeCategory;
  readonly channel: ChannelCategory;
  readonly goal: GoalCategory;
  readonly localContext: LocalContext;
  readonly hasRegionText: boolean;
}

export interface DiagnosisItem {
  readonly title: string;
  readonly description: string;
}

export interface ModulePreview {
  readonly slug: string;
  readonly name: string;
}

export interface ModuleGroup {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly modules: readonly ModulePreview[];
}

const businessKeywordMap: readonly {
  readonly category: BusinessTypeCategory;
  readonly keywords: readonly string[];
}[] = [
  {
    category: "education",
    keywords: [
      "학원",
      "과외",
      "수업",
      "강의",
      "공부",
      "학생",
      "학부모",
      "교육",
      "클래스",
      "입시",
      "영어",
      "수학",
    ],
  },
  {
    category: "beauty",
    keywords: [
      "네일",
      "피부",
      "속눈썹",
      "미용",
      "헤어",
      "뷰티",
      "왁싱",
      "메이크업",
      "샵",
    ],
  },
  {
    category: "fitness",
    keywords: ["필라테스", "헬스", "pt", "요가", "운동", "체형", "재활", "체육"],
  },
  {
    category: "pet",
    keywords: ["강아지", "반려견", "반려동물", "애견", "고양이", "펫", "미용"],
  },
  {
    category: "food",
    keywords: ["카페", "음식점", "식당", "디저트", "베이커리", "커피", "브런치"],
  },
  {
    category: "home-service",
    keywords: ["청소", "인테리어", "수리", "도배", "이사", "방역", "에어컨", "집수리"],
  },
  {
    category: "clinic",
    keywords: ["병원", "의원", "치과", "한의원", "클리닉", "피부과", "상담"],
  },
  {
    category: "online-service",
    keywords: [
      "온라인",
      "상담",
      "코칭",
      "컨설팅",
      "강의",
      "전자책",
      "서비스",
      "디자인",
      "마케팅",
    ],
  },
];

const channelKeywordMap: readonly {
  readonly category: ChannelCategory;
  readonly keywords: readonly string[];
}[] = [
  { category: "naver-place", keywords: ["네이버", "플레이스", "지도", "스마트플레이스"] },
  { category: "instagram", keywords: ["인스타", "instagram", "sns", "릴스"] },
  { category: "blog", keywords: ["블로그", "blog"] },
  { category: "kakao-channel", keywords: ["카카오", "카톡", "채널", "dm", "디엠"] },
  { category: "homepage", keywords: ["홈페이지", "웹사이트", "사이트", "랜딩"] },
  { category: "referral", keywords: ["지인", "소개", "추천"] },
  { category: "offline", keywords: ["전단", "오프라인", "간판", "현수막"] },
  { category: "none", keywords: ["아직", "없어", "없음", "없어요"] },
  { category: "unsure", keywords: ["모르", "잘 모르"] },
];

const goalKeywordMap: readonly {
  readonly category: GoalCategory;
  readonly keywords: readonly string[];
}[] = [
  { category: "booking", keywords: ["예약", "체험", "방문"] },
  { category: "inquiry", keywords: ["문의", "상담", "견적", "학부모"] },
  { category: "purchase", keywords: ["구매", "결제", "신청"] },
  { category: "trust", keywords: ["신뢰", "후기", "리뷰"] },
  { category: "event", keywords: ["이벤트", "쿠폰", "할인"] },
  { category: "acquisition", keywords: ["신규", "유입", "노출", "방문"] },
  { category: "revisit", keywords: ["재방문", "단골", "재구매"] },
  { category: "service-copy", keywords: ["소개", "설명", "문구", "서비스", "진료", "수업", "메뉴"] },
  { category: "pricing", keywords: ["가격", "비용", "견적", "가격표"] },
  { category: "content", keywords: ["콘텐츠", "글", "블로그", "인스타"] },
  { category: "exposure", keywords: ["네이버", "노출", "지역"] },
  { category: "faq", keywords: ["faq", "질문", "자주 묻는"] },
  { category: "unsure", keywords: ["뭐부터", "모르", "막힌"] },
];

export const businessChips = [
  "네일샵",
  "카페",
  "필라테스",
  "강아지 미용",
  "학원",
  "병원·클리닉",
  "청소·인테리어",
  "온라인 서비스",
  "직접 입력",
] as const;

export const channelChips = [
  "네이버플레이스",
  "인스타그램",
  "블로그",
  "카카오채널",
  "홈페이지",
  "지인/소개",
  "전단지/오프라인",
  "아직 없어요",
  "잘 모르겠어요",
] as const;

const fallbackGoalChips = [
  "문의 늘리기",
  "예약 받기",
  "구매로 연결하기",
  "신뢰도 높이기",
  "이벤트 알리기",
  "뭐부터 해야 할지 모르겠어요",
] as const;

const goalChipsByBusinessType: Record<BusinessTypeCategory, readonly string[]> = {
  education: [
    "신규 학생 문의",
    "학부모 상담",
    "수업 소개",
    "후기/신뢰",
    "블로그 글",
    "네이버 노출",
    "뭐부터 해야 할지 모르겠어요",
  ],
  beauty: [
    "예약 문의",
    "시술 소개",
    "인스타 홍보",
    "리뷰 답변",
    "이벤트 안내",
    "재방문 유도",
    "뭐부터 해야 할지 모르겠어요",
  ],
  fitness: [
    "상담 문의",
    "체험 예약",
    "프로그램 소개",
    "후기/신뢰",
    "인스타 홍보",
    "뭐부터 해야 할지 모르겠어요",
  ],
  pet: [
    "예약 문의",
    "서비스 설명",
    "가격 문의 답변",
    "후기/신뢰",
    "재방문 유도",
    "뭐부터 해야 할지 모르겠어요",
  ],
  food: [
    "신규 방문",
    "메뉴 소개",
    "이벤트 홍보",
    "리뷰 답변",
    "인스타 콘텐츠",
    "네이버플레이스 정리",
    "뭐부터 해야 할지 모르겠어요",
  ],
  "home-service": [
    "상담 문의",
    "서비스 설명",
    "가격 문의 답변",
    "후기/신뢰",
    "지역 노출",
    "홈페이지 문구",
    "뭐부터 해야 할지 모르겠어요",
  ],
  clinic: [
    "상담 문의",
    "서비스/진료 설명",
    "신뢰도 높이기",
    "FAQ 정리",
    "리뷰 답변",
    "홈페이지 문구",
    "뭐부터 해야 할지 모르겠어요",
  ],
  "online-service": [
    "상품 소개",
    "상담 문의",
    "가격표 만들기",
    "랜딩페이지 문구",
    "후기/신뢰",
    "결제/신청 흐름",
    "뭐부터 해야 할지 모르겠어요",
  ],
  fallback: fallbackGoalChips,
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function classifyByKeywords<T extends string>(
  value: string,
  map: readonly { readonly category: T; readonly keywords: readonly string[] }[],
  fallback: T,
): T {
  const normalized = normalize(value);
  const match = map.find((item) =>
    item.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())),
  );

  return match?.category ?? fallback;
}

export function classifyBusinessType(value: string): BusinessTypeCategory {
  return classifyByKeywords(value, businessKeywordMap, "fallback");
}

export function classifyChannel(value: string): ChannelCategory {
  return classifyByKeywords(value, channelKeywordMap, "unsure");
}

export function classifyGoal(value: string): GoalCategory {
  return classifyByKeywords(value, goalKeywordMap, "unsure");
}

export function getChannelQuestion(
  businessType: BusinessTypeCategory,
): string {
  const questions: Record<BusinessTypeCategory, string> = {
    education: "학생이나 학부모 문의는 주로 어디서 들어오나요?",
    beauty: "예약 문의는 주로 어디서 들어오나요?",
    fitness: "상담이나 체험 문의는 주로 어디서 들어오나요?",
    pet: "예약이나 상담 문의는 주로 어디서 들어오나요?",
    food: "손님은 주로 어디서 가게를 알게 되나요?",
    "home-service": "견적이나 상담 문의는 주로 어디서 들어오나요?",
    clinic: "상담이나 예약 문의는 주로 어디서 들어오나요?",
    "online-service": "신청이나 상담 문의는 주로 어디서 받고 있나요?",
    fallback: "손님이나 문의는 주로 어디서 들어오나요?",
  };

  return questions[businessType];
}

export function getGoalChips(
  businessType: BusinessTypeCategory,
): readonly string[] {
  return goalChipsByBusinessType[businessType];
}

export function getBusinessTypeLabel(
  businessType: BusinessTypeCategory,
): string {
  const labels: Record<BusinessTypeCategory, string> = {
    education: "교육/학원",
    beauty: "뷰티/미용",
    fitness: "운동/피트니스",
    pet: "반려동물 서비스",
    food: "카페/음식점",
    "home-service": "생활/방문 서비스",
    clinic: "병원/클리닉",
    "online-service": "온라인 서비스",
    fallback: "기타 서비스",
  };

  return labels[businessType];
}

const defaultDiagnosis: readonly DiagnosisItem[] = [
  {
    title: "온라인 첫인상 세팅",
    description:
      "손님이 처음 봤을 때 무엇을 하는 곳인지 바로 알 수 있는 소개 문구가 필요해요.",
  },
  {
    title: "문의/예약 연결 세팅",
    description:
      "글을 보고 바로 문의하거나 예약할 수 있는 문구와 버튼 흐름이 필요해요.",
  },
  {
    title: "노출 점검 세팅",
    description:
      "네이버플레이스, 인스타그램, 홈페이지, 분석 도구 중 빠진 부분을 점검해야 해요.",
  },
];

export function generateAdaptiveDiagnosis(
  context: DiagnosisContext,
): readonly DiagnosisItem[] {
  const byBusinessType: Partial<
    Record<BusinessTypeCategory, readonly DiagnosisItem[]>
  > = {
    education: [
      {
        title: "학부모 신뢰 세팅",
        description:
          "처음 보는 학부모가 수업 방식과 대상, 기대할 수 있는 변화를 쉽게 이해할 수 있어야 해요.",
      },
      {
        title: "상담 연결 세팅",
        description:
          "문의가 왔을 때 수업 방식, 시간, 비용, 상담 흐름으로 자연스럽게 이어지는 안내가 필요해요.",
      },
      {
        title: "후기/FAQ 세팅",
        description:
          "학부모가 걱정하는 부분을 미리 답해주는 질문과 신뢰 문구가 필요해요.",
      },
    ],
    beauty: [
      {
        title: "첫인상 세팅",
        description:
          "처음 보는 손님이 어떤 시술을 받을 수 있는지 바로 이해할 수 있는 소개가 필요해요.",
      },
      {
        title: "예약 연결 세팅",
        description:
          "인스타나 네이버를 보고 바로 예약으로 이어질 수 있는 문구와 버튼 흐름이 필요해요.",
      },
      {
        title: "리뷰/재방문 세팅",
        description:
          "후기 답변과 재방문 유도 문구를 미리 정리해두면 신뢰를 쌓기 쉬워요.",
      },
    ],
    "home-service": [
      {
        title: "서비스 설명 세팅",
        description:
          "처음 보는 고객이 어떤 문제를 해결해주는지 바로 이해할 수 있어야 해요.",
      },
      {
        title: "견적 문의 세팅",
        description:
          "가격 문의가 왔을 때 필요한 정보를 자연스럽게 받을 수 있는 응대 흐름이 필요해요.",
      },
      {
        title: "지역 신뢰 세팅",
        description:
          "지역 기반 서비스라면 네이버플레이스, 후기, 기본 정보를 먼저 점검해야 해요.",
      },
    ],
    food: [
      {
        title: "방문 첫인상 세팅",
        description:
          "처음 보는 손님이 메뉴와 분위기, 방문 이유를 빠르게 이해할 수 있어야 해요.",
      },
      {
        title: "플레이스/리뷰 세팅",
        description:
          "네이버플레이스와 리뷰 답변을 정리하면 방문 전 불안을 줄이기 쉬워요.",
      },
      {
        title: "이벤트 안내 세팅",
        description:
          "신메뉴나 쿠폰을 알릴 때 기간, 조건, 이용 방법을 짧게 정리해두는 흐름이 필요해요.",
      },
    ],
    clinic: [
      {
        title: "진료/서비스 설명 세팅",
        description:
          "처음 보는 사람이 어떤 상담이나 진료를 받을 수 있는지 과장 없이 이해해야 해요.",
      },
      {
        title: "FAQ 신뢰 세팅",
        description:
          "방문 전 자주 묻는 질문과 준비사항을 정리하면 상담 전 불안을 줄일 수 있어요.",
      },
      {
        title: "후기 답변 세팅",
        description:
          "민감한 표현을 피하면서 리뷰에 답하는 기본 기준을 먼저 잡아두는 것이 좋아요.",
      },
    ],
    "online-service": [
      {
        title: "상품 소개 세팅",
        description:
          "온라인에서 처음 보는 사람이 무엇을 신청할 수 있는지 한눈에 이해해야 해요.",
      },
      {
        title: "상담/신청 연결 세팅",
        description:
          "소개 글을 보고 상담, 신청, 결제로 이어지는 버튼 흐름과 안내 문구가 필요해요.",
      },
      {
        title: "후기/가격 신뢰 세팅",
        description:
          "가격표, 진행 방식, 후기를 과장 없이 정리해두면 구매 전 고민을 줄이기 쉬워요.",
      },
    ],
  };

  const items = [...(byBusinessType[context.businessType] ?? defaultDiagnosis)];

  if (context.channel === "none" || context.channel === "unsure") {
    items[2] = {
      title: "채널 시작 세팅",
      description:
        "아직 중심 채널이 없다면 홈페이지, 네이버플레이스, 인스타 중 먼저 열 채널을 정해야 해요.",
    };
  }

  if (context.localContext === "local") {
    items[2] = {
      title: context.hasRegionText ? "지역 문구 세팅" : "지역 노출 점검 세팅",
      description:
        "지역 손님이 중요하다면 네이버플레이스, 지역 키워드, 기본 정보가 자연스럽게 연결되는지 먼저 확인해야 해요.",
    };
  }

  if (context.goal === "event") {
    items[1] = {
      title: "이벤트 안내 세팅",
      description:
        "이벤트는 제목, 기간, 조건, 문의 방법이 짧게 정리되어야 손님이 헷갈리지 않아요.",
    };
  }

  return items.slice(0, 3);
}

const baseModuleGroups: readonly ModuleGroup[] = [
  {
    slug: "first-impression",
    title: "첫인상 만들기",
    description: "처음 보는 사람이 무엇을 하는 곳인지 바로 이해하게 만들어요.",
    modules: [
      { slug: "homepage-builder", name: "홈페이지 만들기 / 첫 화면 만들기" },
      { slug: "naver-place", name: "네이버플레이스 세팅" },
      { slug: "setup-checklist", name: "결제·도메인·분석·SEO 세팅 체크리스트" },
    ],
  },
  {
    slug: "inquiry-flow",
    title: "문의로 연결하기",
    description: "관심이 문의, 예약, 상담으로 이어지는 흐름을 정리해요.",
    modules: [
      { slug: "kakao-dm", name: "카카오채널/DM 응대 문구" },
      { slug: "homepage-cta", name: "문의/예약 CTA" },
      { slug: "seven-day-open-plan", name: "7일 오픈 플랜" },
    ],
  },
  {
    slug: "trust",
    title: "신뢰 쌓기",
    description: "후기, FAQ, 위험 표현을 먼저 점검해 불안을 줄여요.",
    modules: [
      { slug: "review-replies", name: "리뷰 답변 시스템" },
      { slug: "homepage-faq", name: "FAQ 만들기" },
      { slug: "naver-place", name: "네이버플레이스 세팅" },
    ],
  },
  {
    slug: "seven-day-action",
    title: "7일 실행하기",
    description: "홍보, 이벤트, 세팅 점검을 일주일 흐름으로 나눠요.",
    modules: [
      { slug: "instagram-sns", name: "인스타/SNS 홍보 세트" },
      { slug: "event-coupon", name: "이벤트·쿠폰 문구" },
      { slug: "seven-day-open-plan", name: "7일 오픈 플랜" },
      { slug: "setup-checklist", name: "결제·도메인·분석·SEO 세팅 체크리스트" },
    ],
  },
];

function scoreModule(moduleSlug: string, context: DiagnosisContext): number {
  let score = 0;

  if (context.channel === "naver-place" && moduleSlug === "naver-place") score += 8;
  if (context.channel === "instagram" && moduleSlug === "instagram-sns") score += 8;
  if (context.channel === "kakao-channel" && moduleSlug === "kakao-dm") score += 8;
  if (context.channel === "homepage" && moduleSlug === "homepage-builder") score += 8;
  if (context.channel === "blog" && moduleSlug === "setup-checklist") score += 4;
  if (context.channel === "none" || context.channel === "unsure") {
    if (moduleSlug === "homepage-builder") score += 6;
    if (moduleSlug === "naver-place") score += 5;
    if (moduleSlug === "seven-day-open-plan") score += 4;
  }

  if (context.goal === "booking" || context.goal === "inquiry") {
    if (moduleSlug === "kakao-dm") score += 6;
    if (moduleSlug === "homepage-cta") score += 6;
    if (moduleSlug === "homepage-builder") score += 3;
  }

  if (context.goal === "trust" || context.goal === "faq") {
    if (moduleSlug === "review-replies") score += 6;
    if (moduleSlug === "homepage-faq") score += 5;
  }

  if (context.goal === "event") {
    if (moduleSlug === "event-coupon") score += 7;
    if (moduleSlug === "instagram-sns") score += 4;
  }

  if (context.goal === "exposure" || context.localContext === "local") {
    if (moduleSlug === "naver-place") score += 5;
    if (moduleSlug === "setup-checklist") score += 3;
  }

  if (context.businessType === "education" || context.businessType === "clinic") {
    if (moduleSlug === "homepage-faq") score += 4;
    if (moduleSlug === "review-replies") score += 3;
    if (moduleSlug === "kakao-dm") score += 3;
  }

  if (context.businessType === "beauty" || context.businessType === "pet") {
    if (moduleSlug === "instagram-sns") score += 3;
    if (moduleSlug === "review-replies") score += 3;
    if (moduleSlug === "kakao-dm") score += 3;
  }

  return score;
}

export function buildModuleGroups(context: DiagnosisContext): readonly ModuleGroup[] {
  return baseModuleGroups.map((group) => ({
    ...group,
    modules: [...group.modules].sort(
      (a, b) => scoreModule(b.slug, context) - scoreModule(a.slug, context),
    ),
  }));
}
