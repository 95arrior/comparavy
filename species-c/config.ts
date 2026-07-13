// [species-c] 박카 파이프라인 설정 — 모든 임계값은 여기 한 곳에만 둔다(스펙 §3·§4).
// 이 모듈은 기존 앱(lib/·app/)과 어떤 코드도 공유하지 않는다(격리 원칙 §0).

/** 상품 게이트(§3) — fail-closed */
export const PRODUCT_GATE = {
  minReviews: 300, // 리뷰 마이닝 원료 확보
  minRating: 4.3, // 욕먹는 상품은 팔지 않는다
  minCommissionKrw: 1000, // 수수료 '금액' 판정: 판매가 × 수수료율
  priceMin: 10_000, // 저관여 한 세션 구매 구간
  priceMax: 50_000,
  seasonBonus: 2, // 시즌 정합 가산점
  offSeasonPenalty: -2, // 역시즌 감점
};

/** 시즌 테이블(§3) — 월별 수요 테마. 상품 카테고리·이름과 토큰 매칭. */
export const SEASON_TABLE: Record<number, string[]> = {
  1: ["새해", "다이어리", "플래너", "보온", "방한", "가습", "목표", "정리"],
  2: ["환절기", "새학기", "입학", "졸업", "발렌타인", "이사"],
  3: ["봄", "미세먼지", "황사", "꽃가루", "새학기", "환기", "알레르기"],
  4: ["봄나들이", "캠핑", "피크닉", "자외선", "벚꽃", "운동화"],
  5: ["가정의달", "어버이날", "어린이날", "선물", "야외", "자외선", "모기"],
  6: ["초여름", "장마대비", "제습", "냉감", "모기", "선풍기", "샌들"],
  7: ["냄새", "햇빛", "습기", "장마", "제습", "곰팡이", "차량", "에어컨", "물놀이"],
  8: ["폭염", "휴가", "물놀이", "쿨링", "냉감", "자외선", "캠핑", "아이스"],
  9: ["환절기", "추석", "선물세트", "가을", "등산", "면역"],
  10: ["가을", "등산", "캠핑", "건조", "보습", "핼러윈", "김장준비"],
  11: ["김장", "수능", "보온", "난방", "가습", "블랙프라이데이", "연말준비"],
  12: ["연말", "선물", "크리스마스", "방한", "난방", "가습", "새해준비"],
};

/** 키워드 밴드(§4) — 신생 블로그 기준. 상수로 조정 가능. */
export const KEYWORD_BAND = {
  volMin: 500,
  volMax: 3000,
  blogTotalMax: 1000,
  candidatesMin: 15, // LLM 후보 생성 개수
  candidatesMax: 30,
  subKeywords: 3, // 메인 1 + 서브 최대
};

/** 구매 여정 스코어(§4) */
export const JOURNEY_SCORE: Record<string, number> = {
  purchase: 2, // 구매직전형: "OO 추천", "A vs B"
  problem: 2, // 문제형: "차 에어컨 냄새"
  info: 1, // 정보형: "에어컨 냄새 원인"
  owner: 0, // 보유자형: 사용법·세척법(이미 산 사람)
};

/** 대가성 고정 문구(§7-1 2번) — 상수, 본문 시작 직후 고정, 생략 절대 불가 */
export const DISCLOSURE_TEXT =
  "판매왕답게 먼저 고백합니다. 이 글로 판매가 발생하면 수수료를 받습니다. 그래서 더 깐깐하게 골랐습니다.";

/** 링크 교체 마커(§7-1 6·8번) — 정확히 2회 존재해야 게이트 통과 */
export const LINK_MARKER = "[쇼핑커넥트 링크 교체 위치]";
/** 이미지 삽입 마커 프리픽스 */
export const IMAGE_MARKER_PREFIX = "[이미지:";

/** 금지 표현(§0-5·§9-2) — 과장·보장·의학 단정 */
export const BANNED_PHRASES = [
  "무조건", "100%", "최저가 보장", "부작용 없는", "즉시 효과", "완벽한", "절대적",
  "국내 최초", "세계 최초", "업계 1위", "유일한", "보장합니다", "확실히 낫", "치료 효과",
  "완치", "만병통치", "부작용이 없", "즉효",
];

/** 가짜 1인칭 사용감 스캔 패턴(§9-3) — 실사용 입력 없을 때 걸리면 실격 */
export const FAKE_EXPERIENCE_PATTERNS = [
  /제가\s*(직접\s*)?(써|사용해|먹어|발라|입어|신어|타)\s*(보니|봤|본)/,
  /직접\s*(써|사용해|구매해|주문해)\s*(보니|봤|본)/,
  /실제로\s*(써|사용해)\s*(보니|봤|본)/,
  /배송\s*받(아|은)\s*(보니|후)/,
];

/** 리뷰 인용 규칙(§6) */
export const REVIEW_QUOTE = { maxLen: 15, maxCount: 3 };

/** 제품 풀네임 반복(§7-2): 제목·첫 문단·소제목 각 1회 외 본문 반복 금지 */
export const FULLNAME_MAX_BODY = 3;

/** 이미지 카드(§8) */
export const CARD = {
  width: 880, // 네이버 본문 폭 기준
  minFontPx: 22, // 모바일 축소 가독 하한
  palette: { bg: "#FFF7E8", ink: "#2B2117", accent: "#D6452C", sub: "#8A6F4D", stamp: "#1D5CB8" },
  headerLabel: "박카상사 상품분석실",
  stampLabel: "이달의 사원 추천",
};

/** 본문 분량(자) */
export const ARTICLE_LENGTH = { min: 1400, max: 1900 };

/** LLM */
// max_tokens는 사고(thinking) 예산까지 포함 — 짜게 잡으면 JSON이 잘린다(기존 시스템 실측 교훈: thumb-copy 300 잘림 사고)
export const LLM = { model: "claude-opus-4-8", briefMaxTokens: 6000, articleMaxTokens: 20000, keywordMaxTokens: 6000, reviewMaxTokens: 8000 };

/** ★신뢰 회계(라운드1 A) — '3,128건 분석+6회 언급' 사고 박제 */
export const SAMPLE_MIN_FOR_NUMBERS = 30; // 미만이면 수치 표기 금지(정성 서술)
export const samplePhrase = (total: number, sample: number) => `전체 리뷰 ${total.toLocaleString()}건 중 최근 ${sample}건을 직접 정독했습니다.`;
/** 실사용 입력 없으면 제목·본문·태그 금지(라운드1 B-2) */
export const FAKE_REVIEW_WORDS = ["후기", "사용기", "내돈내산", "직접 써보니"];

/** 태그 개수(§7-1 9번) */
export const TAG_COUNT = 10;
