// ★글감 점수 가중치 — 한 곳에서 관리. '공격 모드'(백로그)가 이 상수를 오버라이드하는 지점.
//  단가 축은 ad_depth(광고 밀도 프록시, 0~15+)를 0~1로 정규화해 서빙 랭크에 가산.
export const BID_WEIGHT = 0.25;        // 수익(단가) 축 — 랜덤(0~1) 대비 소프트 부스트
export const BID_DEPTH_CAP = 15;       // 정규화 상한(그 이상은 동일 취급)
export const BID_COMP_BONUS: Record<string, number> = { "높음": 2, "중간": 1 }; // 광고경쟁 보정(depth 천장 10 포화 대응 — 실측)
export const BID_BADGE_RATIO = 0.3;    // '단가 높음' 배지 — 카테고리 '상대' 상위 30% 랭크(percentile은 동률 포화 시 전원/0명 극단 — 실측으로 랭크 방식 확정)
export const BID_HIGH_MIN_DEPTH = 5;   // 최소 절대 바닥(광고 5개 미만이면 상대 상위여도 배지 없음)

// ── 배합 규칙(백로그 승격) — 일일 글감 배합. ★공격 모드(ATTACK)가 이 값들을 오버라이드한다. ──
export const MIX_ISSUE_TO_STOCK = { issue: 2, stock: 1 };  // 기본 이슈 2 : 스톡 1
export const MIX_STOCK_LATE_BONUS = 0.5; // 코스 후반(day>=12) 스톡 비중 가산
export const REVIEW_WEEKLY_MIN = 2;      // 주간 리뷰형 최소 보장(쇼핑커넥트 경로가 굶지 않게)
// 배합 가중 학습(증폭) — 유저별 mix_weights[type]. 상한·하한 필수(독점 금지·다양성 하한).
export const MIX_WEIGHT_STEP = 0.1;
export const MIX_WEIGHT_CAP = 1.5;
export const MIX_WEIGHT_FLOOR = 0.7;
// 체크인 급등 감지 — 최근 7일 평균 대비 배수 + 절대 최소(소표본 오탐 방지)
export const SPIKE_RATIO = 2.0;
export const SPIKE_MIN_VISITORS = 30;

// ── 공격 모드(Part 3) — 잠금해제 조건 충족 유저만. 초보 미노출. ──
export const ATTACK = {
  BID_WEIGHT: 0.5,          // 고단가 비중 상향(기본 0.25)
  ALLOW_COMP_HIGH: true,    // 경쟁 보통·높음도 후보 포함
  REVIEW_BOOST: 0.3,        // 리뷰·커머스형 부스트
  DAILY_LIMIT: 3,           // 일 3편 안전선 유지(공격은 물량이 아니라 화력)
  ADMIN_DAILY_LIMIT: 5,     // 한계 테스트 트랙(관리자 플래그 계정)만
};
export const ATTACK_UNLOCK = { minVerified: 30, needApproved: true, recentDailyPace: 3 }; // 자동 제안 조건

// ── 성과 루프·티어 상수(2026-07-11 업그레이드 — 전부 FF_* 플래그 뒤, 기본 OFF) ──
export const RANK_WIN = { blogTabTop: 10 } as const;      // 상위노출 판정: 블로그탭 N위 이내(조정 가능 상수 — 스펙 §1-2)
export const RANK_CHECK_DAYS = [1, 3, 7, 14] as const;    // 순위 체크 시점(D+N)
export const PERF_MIN_SAMPLE = 30;                        // 이 표본 미만 조합엔 가중치 절대 미적용(§1-4)
export const PERF_WEIGHT_CLAMP = 0.2;                     // 보정 가중치 ±20% 클램프
// tier별 에버그린 밴드(§2-2) — [vol하한, vol상한, blog_total상한(null=제한없음)]
export const TIER_BANDS = {
  SEEDLING: { volMin: 500, volMax: 3000, blogTotalMax: 1000 },
  GROWING: { volMin: 1000, volMax: 10000, blogTotalMax: 5000 },
  ESTABLISHED: { volMin: 2000, volMax: 30000, blogTotalMax: null as number | null },
} as const;
// tier 승급 조건(§2-1) — 최근 10건 중 D+7 상위노출 승수
export const TIER_PROMOTE = { GROWING: 3, ESTABLISHED: 5, ESTABLISHED_BIGWIN: { vol: 5000, wins: 2 } } as const;
export const TIER_DEMOTE_MARGIN = 2; // 강등 보수 기준: 승급선보다 이만큼 크게 밑돌 때만 한 단계
// tier별 트렌드:에버그린 슬롯 비율(§4)
export const TIER_MIX = { SEEDLING: [7, 3], GROWING: [5, 5], ESTABLISHED: [3, 7] } as const;
// 씨앗 동시 발행 상한(§5) — 대형 풀 씨앗은 여유, 일반은 타이트
export const SEED_CLAIM_CAP = { big: 5, normal: 3 } as const;
export const SEED_CLAIM_WINDOW_H = 72; // 클레임 유효(동시 활성) 창
// 수익 경로 태그(§6) — high_cpc 판정 임계(ad_depth)
export const REVENUE_HIGH_CPC_DEPTH = 8;
// WP 자동발행 일일 상한(2026-07-12 유저 확정: 하루 2편) — 2편은 8시간 간격으로 분산(도배 패턴 방지)
export const WP_DAILY_CAP = 2;
export const WP_SECOND_SLOT_OFFSET_H = 8;
