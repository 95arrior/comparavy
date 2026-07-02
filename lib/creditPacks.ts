// 크레딧 팩 정의 — 클라이언트·서버 공용 순수 데이터 (서버 헬퍼는 lib/credits.ts).
// 마진 하한 70%(크레딧당 500원). 트라이얼은 마진 계산 제외(어뷰징 필터+결제 워밍업).

export const GENERATE_COST = 1; // 글 1편당 차감 크레딧

export interface CreditPack {
  key: string;
  name: string;
  credits: number;
  price: number; // KRW
  /** 24시간 한정 할인가(트라이얼 소진 직후) — 크레딧당 498원 = 마진 70% 바닥, 이 밑으로 할인 금지 */
  salePrice?: number;
  desc: string;
  highlight?: boolean;
}

export const CREDIT_PACKS: CreditPack[] = [
  { key: "trial", name: "트라이얼", credits: 3, price: 1900, desc: "코스 3일 체험 — 글 3편" },
  { key: "standard", name: "스탠다드", credits: 30, price: 19900, desc: "한 달, 매일 1편 페이스" },
  { key: "approval", name: "승인 팩", credits: 60, price: 34900, salePrice: 29900, desc: "애드포스트 승인 코스(20일×3편) 완주", highlight: true },
  { key: "pro", name: "프로", credits: 100, price: 49900, desc: "본격 운영 · 크레딧당 최저가" },
];

export function packByKey(key: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.key === key);
}
