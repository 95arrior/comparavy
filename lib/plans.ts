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
