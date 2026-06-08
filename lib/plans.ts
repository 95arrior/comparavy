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
  /** 워드프레스 연결·자동발행 허용 (무료는 생성·복사만, Pro만 발행) */
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
    articles: 50,
    maxWords: 5000,
    wordpress: true,
    highlight: true,
  },
};

/** 플랜 카드에 노출할 가치(핵심 기능) 목록 */
export const PLAN_FEATURES: Record<PlanKey, string[]> = {
  free: ["월 3편 생성", "글당 1,500자", "실시간 생성 화면", "AI 티 제거 · 정직성 보장", "복사해서 사용"],
  pro: [
    "월 50편 생성",
    "글당 5,000자 깊이",
    "워드프레스 1클릭 발행",
    "한국 구글 SEO 자동 (제목·메타·FAQ·소제목)",
    "구조 다양성 — 매번 다른 글",
    "AI 티 제거 · 정직성 보장",
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
