// ★기능 플래그(2026-07-11 성과 루프 업그레이드) — 전부 서버 전용, 기본 OFF = 현행과 100% 동일 동작.
//  Vercel env에 FF_XXX=1 을 넣으면 켜진다. 하나씩 켜서 검증하는 운영 계약(유저 승인 스펙 §0-3).
const on = (v: string | undefined) => v === "1" || v === "true";

export const FF = {
  /** 1단계 — 발행 스냅샷·순위 추적·유입/수익 임포트·되먹임 가중치 */
  get perfLoop() { return on(process.env.FF_PERF_LOOP); },
  /** 2단계 — blog_tier 판정 + tier별 에버그린 검색량 밴드 */
  get tierBands() { return on(process.env.FF_TIER_BANDS); },
  /** 3단계 — 체류 프록시(dwell_potential) 가산 + 브리프 지시 */
  get dwellScore() { return on(process.env.FF_DWELL_SCORE); },
  /** 4단계 — tier별 트렌드:에버그린 슬롯 비율 */
  get tierMix() { return on(process.env.FF_TIER_MIX); },
  /** 5단계 — 공유 씨앗 동시 발행 상한 + 유저 고유 관점 블록 + WP 발행 지터 */
  get seedClaim() { return on(process.env.FF_SEED_CLAIM); },
  /** 6단계 — 수익 경로 태그(high_cpc/affiliate/brandconnect) */
  get revenueTag() { return on(process.env.FF_REVENUE_TAG); },
};
