// 크레딧 팩 정의 — 클라이언트·서버 공용 순수 데이터 (서버 헬퍼는 lib/credits.ts).
// ★단위 설계(Runway 패턴): 글 1편 = 10크레딧, 팩은 수백~천 단위 — '큰 지갑에서 조금씩' 느낌 +
//   미래 경량 기능(제목 재생성 2cr, 태그 1cr 등) 차등 과금 여지. 가격·마진은 1편=1cr 시절과 동일(표기만 10배).
// 마진 하한 70%(글 1편분=500원). 트라이얼은 마진 계산 제외(어뷰징 필터+결제 워밍업).

export const GENERATE_COST = 10; // 글 1편당 차감 크레딧

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
  { key: "trial", name: "트라이얼", credits: 30, price: 1900, desc: "글 3편" },
  { key: "standard", name: "스탠다드", credits: 300, price: 19900, desc: "글 30편" },
  { key: "approval", name: "승인 팩", credits: 600, price: 34900, salePrice: 29900, desc: "글 60편 · 승인 코스 완주", highlight: true },
  { key: "pro", name: "프로", credits: 1000, price: 49900, desc: "글 100편 · 편당 최저가" },
];

export function packByKey(key: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.key === key);
}
