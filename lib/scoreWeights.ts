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
// ★신생 밴드 하향(2026-08-01 실측): 500~3,000이었는데 설계값은 100~2,000이었다. 돼지통(1개월차) 실측 —
//  노출된 글은 전부 월 300~800 니치(KB스타기업뱅킹 1위·대법원경매정보 공고문 1위)였고,
//  수요 5천~8만 헤드는 12개 중 0개 노출. 하한 500이 실제 승자 구간(300~800)의 아래쪽을 잘라내고 있었다.
// ★문서수 상한 1,000 → 3,000(2026-08-04 실측 근거로 개정).
//  근거: 경제·재테크 풀에서 실제로 잰 분포 — 밴드 안 측정분 1,043개 중 문서수 1,000 미만은 5개(0.5%),
//  백필 표본 252개에서도 7개(2.8%)였다. 상한 1,000은 '엄격한 기준'이 아니라 '재고가 없는 기준'이다.
//  3,000이면 같은 표본에서 6.7%(약 118개까지 확보) — 신생이 이길 만한 구간은 유지하면서 레인이 돈다.
//  ★되돌리기 쉬운 값이다. 순위 실측(rank_snapshots)에서 3,000대가 안 먹히면 다시 내린다.
export const TIER_BANDS = {
  SEEDLING: { volMin: 100, volMax: 2000, blogTotalMax: 3000 },
  GROWING: { volMin: 1000, volMax: 10000, blogTotalMax: 5000 },
  ESTABLISHED: { volMin: 2000, volMax: 30000, blogTotalMax: null as number | null },
} as const;
// tier 승급 조건(§2-1) — 최근 10건 중 D+7 상위노출 승수
export const TIER_PROMOTE = { GROWING: 3, ESTABLISHED: 5, ESTABLISHED_BIGWIN: { vol: 5000, wins: 2 } } as const;
export const TIER_DEMOTE_MARGIN = 2; // 강등 보수 기준: 승급선보다 이만큼 크게 밑돌 때만 한 단계
// ── 레인 배합(2026-08-01 유저 확정 — 4분할) ──────────────────────────────────
// ★배경: 설계는 '황금60/트렌드25/헤드15'였는데 코드는 2분할 [트렌드,에버그린]=[7,3]이었다.
//  신생인데 트렌드가 70% — 설계(25%)의 정반대. 돼지통 7/31 발행 5편이 전부 헤드로 나가 노출 0/5.
//  원인 사슬: 트렌드 레인은 volBand(검색량 높을수록 상위)로 정렬되고, 트렌드 카드는 vol:0으로 만들어져
//  bandInvariant가 구조적으로 못 거른다 → 신생 보드에 헤드가 꽂힌다.
// ★홈판을 정식 레인으로 승격(기존 homefeedBet 1일 1장 → 배합 몫만큼). 검색은 상한이 검색량이지만
//  홈판은 반응 게임이라 상한이 없다 — 편당 조회 150 → 1,500이 필요한데 니치 1위로는 산수가 안 된다.
export type Lane = "golden" | "homefeed" | "trend" | "head";
export const TIER_LANE_MIX: Record<string, Record<Lane, number>> = {
  // 유저 선택(2026-08-01): 홈판 주력 — 목표 최단 경로. 홈판 휘발성 리스크는 인지하고 선택함.
  // ★2026-08-04 유저 확정: "꾸준한 수요를 2~3개로 줄이고 홈판 비중을 늘립시다."
  //  연료론 전환의 논리적 귀결이다 — 홈판이 지수를 올려 검색 글을 끌어올린다면 홈판에 더 태워야 한다.
  //  ★열 크기도 같이 바꾼다(아래 COLUMN_SIZE): 지금 뜨는 7장 / 꾸준한 수요 3장.
  //  ★헤드 5→10: 열이 3장으로 줄면 5%로는 자리가 0이 된다. 헤드는 밴드 사다리 장치라
  //   '꾸준한 수요를 줄이자'가 '헤드를 버리자'는 뜻은 아니다 — 체급이 오르면 그 글이 뒤늦게 일한다.
  SEEDLING: { golden: 20, homefeed: 50, trend: 20, head: 10 },
  GROWING: { golden: 40, homefeed: 30, trend: 15, head: 15 },
  ESTABLISHED: { golden: 30, homefeed: 25, trend: 15, head: 30 },
};

// ★열↔레인 매핑(2026-08-01 — 이중체크에서 검거).
//  배합을 4분할로 고쳤는데 그게 유저 화면에 안 닿고 있었다: 실제로 렌더되는 보드는 '지금 뜨는'(mode=short)과
//  '꾸준한 수요'(mode=long) 2열인데, 4분할은 렌더되지 않는 모드리스 경로에서만 돌았다(죽은 코드).
//  두 열의 성격이 레인과 정확히 겹치므로 열을 레인의 그릇으로 쓴다:
//    지금 뜨는  = 홈판 + 트렌드   (반응·시의성 게임 — 상한 없음)
//    꾸준한 수요 = 황금 + 헤드     (검색 자산 게임 — 상한 = 검색량)
//  각 열 5장 × 2열 = 하루 10편(유저 확정 발행량)과 정확히 맞는다.
export const COLUMN_LANES = { short: ["homefeed", "trend"], long: ["golden", "head"] } as const satisfies Record<string, readonly Lane[]>;
export type BoardColumn = keyof typeof COLUMN_LANES;
// ★열별 장수(2026-08-04 유저 확정) — 종전엔 두 열이 각각 5장으로 고정이었다.
//  꾸준한 수요를 3장으로 줄이고 그만큼을 지금 뜨는 열로 옮긴다. 하루 총량 10편은 그대로다.
export const COLUMN_SIZE = { short: 7, long: 3 } as const satisfies Record<BoardColumn, number>;

/**
 * 한 열(perColumn장) 안에서의 레인별 장수. 열 안 비율은 전체 배합에서 그 열 몫만 떼어 정규화한다.
 * 예) 신생 홈판40·트렌드15 → short 5장 = 홈판 4 / 트렌드 1.
 */
export function columnQuota(tier: string, column: BoardColumn, perColumn: number): Record<Lane, number> {
  const mix = TIER_LANE_MIX[tier] ?? TIER_LANE_MIX.SEEDLING;
  const lanes = COLUMN_LANES[column];
  const total = lanes.reduce((s, l) => s + mix[l], 0);
  const out = { golden: 0, homefeed: 0, trend: 0, head: 0 } as Record<Lane, number>;
  if (total <= 0 || perColumn <= 0) return out;
  const exact = lanes.map((l) => ({ l, v: (mix[l] / total) * perColumn }));
  for (const e of exact) out[e.l] = Math.floor(e.v);
  let left = perColumn - lanes.reduce((s, l) => s + out[l], 0);
  for (const e of [...exact].sort((a, b) => (b.v % 1) - (a.v % 1))) {
    if (left <= 0) break;
    out[e.l] += 1;
    left -= 1;
  }
  return out;
}

/**
 * 하루 전체 레인 쿼터 = 두 열 쿼터의 합. ★단일 진실원(2026-08-01 이중체크에서 검거).
 * 종전엔 laneQuota(tier, 10)과 columnQuota 두 곳이 같은 값을 따로 계산해 ESTABLISHED에서 실제로 어긋났다
 * (열합 트렌드2·헤드2 vs laneQuota 트렌드1·헤드3). 화면은 열 단위로 서빙되므로 **열이 진실**이고,
 * 하루 총량은 그 합으로만 정의한다 — 두 경로가 드리프트할 여지를 없앤다.
 */
export function dayQuota(tier: string, _perColumn = 0): Record<Lane, number> {
  // ★열 크기는 COLUMN_SIZE가 정한다(2026-08-04) — 종전엔 두 열이 같은 수라 인자 하나로 됐다.
  //  지금은 지금 뜨는 7 / 꾸준한 수요 3으로 다르다. 인자는 호환용으로만 남긴다.
  const s = columnQuota(tier, "short", COLUMN_SIZE.short);
  const l = columnQuota(tier, "long", COLUMN_SIZE.long);
  return { golden: l.golden, homefeed: s.homefeed, trend: s.trend, head: l.head };
}

/**
 * 배합 비율(%)을 총 n장에 대한 레인별 장수로 — 최대잔여법(합이 정확히 n이 되게).
 * ★보드 조립에는 쓰지 않는다(dayQuota를 쓴다). 비율 자체를 검증·표시할 때만 쓰는 참조 구현.
 */
export function laneQuota(tier: string, n: number): Record<Lane, number> {
  const mix = TIER_LANE_MIX[tier] ?? TIER_LANE_MIX.SEEDLING;
  const lanes = Object.keys(mix) as Lane[];
  const exact = lanes.map((l) => ({ l, v: (mix[l] / 100) * n }));
  const out = Object.fromEntries(exact.map((e) => [e.l, Math.floor(e.v)])) as Record<Lane, number>;
  let left = n - lanes.reduce((s, l) => s + out[l], 0);
  for (const e of [...exact].sort((a, b) => (b.v % 1) - (a.v % 1))) {
    if (left <= 0) break;
    out[e.l] += 1;
    left -= 1;
  }
  return out;
}

// 구 2분할(트렌드:에버그린) — 아직 참조하는 경로가 있어 남겨두되 신규 사용 금지.
export const TIER_MIX = { SEEDLING: [7, 3], GROWING: [5, 5], ESTABLISHED: [3, 7] } as const;
// 씨앗 동시 발행 상한(§5) — 대형 풀 씨앗은 여유, 일반은 타이트
export const SEED_CLAIM_CAP = { big: 5, normal: 3 } as const;
export const SEED_CLAIM_WINDOW_H = 72; // 클레임 유효(동시 활성) 창
// 수익 경로 태그(§6) — high_cpc 판정 임계(ad_depth)
export const REVENUE_HIGH_CPC_DEPTH = 8;
// WP 일일 정책(2026-07-13 유저 확정: 자동 2편 권장 + 수동은 10편까지 허용)
export const WP_DAILY_CAP = 2;        // 크론 자동 생성 권장선(1편=설정 시각, 2편=8시간 뒤)
export const WP_DAILY_HARD_CAP = 10;  // 수동 [다음 글 만들기] 하드 상한
export const WP_SECOND_SLOT_OFFSET_H = 8;
