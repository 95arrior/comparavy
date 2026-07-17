// ★기능 플래그(2026-07-11 성과 루프 업그레이드) — 전부 서버 전용, 기본 OFF = 현행과 100% 동일 동작.
//  Vercel env에 FF_XXX=1 을 넣으면 켜진다. 하나씩 켜서 검증하는 운영 계약(유저 승인 스펙 §0-3).
const on = (v: string | undefined) => v === "1" || v === "true";

export const FF = {
  /** 1단계 — 발행 스냅샷·순위 추적·유입/수익 임포트·되먹임 가중치. ★기본 ON(유저 지시 2026-07-15: 밴드 사다리 가동 — 순위 실측이 단계 판정의 원료) — 끌 때만 FF_PERF_LOOP=0 */
  get perfLoop() { return process.env.FF_PERF_LOOP !== "0"; },
  /** 2단계 — blog_tier 판정 + tier별 에버그린 검색량 밴드. ★기본 ON(유저 승인 2026-07-13: 체급 안 맞는 글감 혼입 차단) — 끌 때만 FF_TIER_BANDS=0 */
  get tierBands() { return process.env.FF_TIER_BANDS !== "0"; },
  /** 3단계 — 체류 프록시(dwell_potential) 가산 + 브리프 지시 */
  get dwellScore() { return on(process.env.FF_DWELL_SCORE); },
  /** 4단계 — tier별 트렌드:에버그린 슬롯 비율. ★기본 ON(2026-07-14 유저 실행이 설계 검증: 묘목 체급은 트렌드 위주가 정답) — 끌 때만 FF_TIER_MIX=0 */
  get tierMix() { return process.env.FF_TIER_MIX !== "0"; },
  /** 5단계 — 공유 씨앗 동시 발행 상한 + 유저 고유 관점 블록 + WP 발행 지터 */
  get seedClaim() { return on(process.env.FF_SEED_CLAIM); },
  /** 6단계 — 수익 경로 태그(high_cpc/affiliate/brandconnect) */
  get revenueTag() { return on(process.env.FF_REVENUE_TAG); },
  /** ★홈판 배팅 카드(2026-07-15 유저 확정) — 홈피드 폭발형 글감 1일 1장. 기본 ON, 끌 때만 FF_HOMEFEED_BET=0 */
  get homefeedBet() { return process.env.FF_HOMEFEED_BET !== "0"; },
  /** ★갱신 대상 선정(2026-07-17 전략 회의) — 개정 시즌에 걸린 오래된 발행 글을 renewal_queue에 등재(재발행은 검토 후). 기본 ON, 끌 때만 FF_REVISION_SCAN=0 */
  get revisionScan() { return process.env.FF_REVISION_SCAN !== "0"; },
};
