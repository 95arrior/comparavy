export type PlanKey = "free" | "pro";

export interface Plan {
  key: PlanKey;
  name: string;
  /** 월 구독료 (KRW). placeholder — 정확한 금액은 추후 확정. */
  price: number;
  /** 월 글 생성 한도 (편) */
  articles: number;
  /** 글당 최대 글자수 (한국어 기준) */
  maxWords: number;
  highlight: boolean;
}

export const PLANS: Record<PlanKey, Plan> = {
  free: {
    key: "free",
    name: "무료",
    price: 0,
    articles: 3,
    maxWords: 1500,
    highlight: false,
  },
  pro: {
    key: "pro",
    name: "프로",
    // TODO: 실제 가격 확정 후 교체 (placeholder)
    price: 9900,
    articles: 60,
    maxWords: 4000,
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
