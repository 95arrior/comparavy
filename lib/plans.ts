export type PlanKey = "free" | "pro";

export interface Plan {
  key: PlanKey;
  name: string;
  /** 월 구독료 (KRW). */
  price: number;
  /** 월 글 생성 한도 (편) */
  articles: number;
  /** 글당 최대 글자수 (한국어 기준) */
  maxWords: number;
  /** [레거시·비활성] 워드프레스 연결·자동발행 — 네이버 단일 피벗으로 UI 제거, 휴면 API 가드용으로만 유지 */
  wordpress: boolean;
  highlight: boolean;
}

export const PLANS: Record<PlanKey, Plan> = {
  free: {
    key: "free",
    name: "무료",
    price: 0,
    articles: 3,
    maxWords: 1500,
    wordpress: false,
    highlight: false,
  },
  pro: {
    key: "pro",
    name: "프로",
    price: 29900,
    articles: 30,
    maxWords: 5000,
    wordpress: true,
    highlight: true,
  },
};

/** 플랜 카드에 노출할 가치(핵심 기능) 목록 — 네이버 수익형 단일 */
export const PLAN_FEATURES: Record<PlanKey, string[]> = {
  free: [
    "평생 무료 3편 (체험)",
    "네이버 규격 글 (짧은 문단·형광펜·해시태그)",
    "AI 글 같은 말투 제거 · 정직성 보장",
    "복사해서 네이버에 붙여넣기",
  ],
  pro: [
    "월 30편 생성 — 매일 꾸준함이 지수가 돼요",
    "네이버 규격 자동 (질문형 제목·짧은 문단·형광펜·해시태그)",
    "황금 키워드 글감 추천 (검색량·경쟁 데이터)",
    "중복 없는 글 — 같은 키워드도 매번 다른 글",
    "광고법·규제 표현 자동 검토",
    "AI 글 같은 말투 제거 · 정직성 보장",
    "우선 처리",
  ],
};

/** 토스 빌링 주문명에 사용 */
export const PRO_ORDER_NAME = "AteFlo 프로 월 구독";

/** plan에 따른 사용량 한도 (DB users 테이블에 반영) */
export function planLimits(key: PlanKey): {
  articles_limit: number;
  max_words: number;
} {
  return {
    articles_limit: PLANS[key].articles,
    max_words: PLANS[key].maxWords,
  };
}

export function formatKRW(won: number): string {
  return `₩${won.toLocaleString("ko-KR")}`;
}
