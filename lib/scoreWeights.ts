// ★글감 점수 가중치 — 한 곳에서 관리. '공격 모드'(백로그)가 이 상수를 오버라이드하는 지점.
//  단가 축은 ad_depth(광고 밀도 프록시, 0~15+)를 0~1로 정규화해 서빙 랭크에 가산.
export const BID_WEIGHT = 0.25;        // 수익(단가) 축 — 랜덤(0~1) 대비 소프트 부스트
export const BID_DEPTH_CAP = 15;       // 정규화 상한(그 이상은 동일 취급)
export const BID_COMP_BONUS: Record<string, number> = { "높음": 2, "중간": 1 }; // 광고경쟁 보정(depth 천장 10 포화 대응 — 실측)
export const BID_BADGE_RATIO = 0.3;    // '단가 높음' 배지 — 카테고리 '상대' 상위 30% 랭크(percentile은 동률 포화 시 전원/0명 극단 — 실측으로 랭크 방식 확정)
export const BID_HIGH_MIN_DEPTH = 5;   // 최소 절대 바닥(광고 5개 미만이면 상대 상위여도 배지 없음)
