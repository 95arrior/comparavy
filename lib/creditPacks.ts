// 크레딧 팩 정의 — 클라이언트·서버 공용 순수 데이터 (서버 헬퍼는 lib/credits.ts).
// ★단위 설계(Runway 패턴): 글 1편 = 10크레딧, 팩은 수백~천 단위 — '큰 지갑에서 조금씩' 느낌 +
//   미래 경량 기능(제목 재생성 2cr, 태그 1cr 등) 차등 과금 여지. 가격·마진은 1편=1cr 시절과 동일(표기만 10배).
// 마진 하한 70%(글 1편분=500원). 트라이얼은 마진 계산 제외(어뷰징 필터+결제 워밍업).

export const GENERATE_COST = 15; // 글 1편당(네이버) — AI 원가+글감 파이프라인·검증 크론·인프라 간접비 반영(2026-07-07 인상)
export const WP_GENERATE_COST = 20; // WP 자동 발행 1편 — 자동화 프리미엄(생성+발행+내부링크+색인 규격, 손 없이 완결)
export const IMAGE_COST = 6; // AI 이미지·3D 썸네일 1장당(원가 ~55원+스토리지·검증 — 마진 ~85%, 2026-07-07 인상)

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
  { key: "trial", name: "트라이얼", credits: 30, price: 1900, desc: "약 2편 · 처음 맛보기" },
  { key: "standard", name: "스탠다드", credits: 300, price: 19900, desc: "약 20편 · 한 달 페이스" },
  { key: "approval", name: "승인 팩", credits: 600, price: 34900, salePrice: 29900, desc: "약 40편 · 승인 코스 완주", highlight: true },
  { key: "pro", name: "프로", credits: 1000, price: 49900, desc: "약 66편 · 가장 넉넉하게" },
];

export function packByKey(key: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.key === key);
}
