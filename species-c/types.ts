// [species-c] 파이프라인 공용 타입.

export interface ProductInput {
  /** 스마트스토어 상품 URL */
  url: string;
  /** 쇼핑커넥트 화면의 수수료율(%) — 수동 입력 */
  commissionPct: number;
  /** 아래 5필드: 자동 수집 실패 시 수동 입력(1급 폴백) */
  name?: string;
  price?: number;
  rating?: number;
  reviewCount?: number;
  category?: string;
  discountPct?: number;
  /** 상품 페이지에서 복사한 리뷰 텍스트 뭉치(자동 수집 실패 시 폴백) */
  reviewsText?: string;
  /** ★쇼핑커넥트 발급 링크(있으면 본문 링크 자리에 자동 삽입 — 마커 교체 단계 소멸) */
  connectLink?: string;
  /** 사용자 실사용 경험 한 줄 — 있으면 하드셀 강화 */
  myExperience?: string;
  /** 비교형: 두 번째 상품 */
  compareWith?: Omit<ProductInput, "compareWith">;
  /** 게이트 실격 무시(경고 유지) */
  override?: boolean;
}

export interface Product {
  url: string;
  name: string;
  price: number;
  rating: number;
  reviewCount: number;
  category: string;
  discountPct: number;
  commissionPct: number;
  reviewsText: string;
  myExperience: string | null;
  connectLink: string | null;
  source: "auto" | "manual" | "mixed";
}

export interface GateCheck { key: string; label: string; pass: boolean; detail: string; score?: number }
export interface GateResult { pass: boolean; checks: GateCheck[]; seasonScore: number }

export type KeywordLayer = "problem" | "purchase" | "info" | "owner";
export interface KeywordCand {
  keyword: string;
  layer: KeywordLayer;
  /** 후보 출처(바늘 광산): llm | autocomplete | matrix | review */
  source: "llm" | "autocomplete" | "matrix" | "review";
  vol: number | null; // 월 검색량(모바일+PC) — null=실측 실패(폐기)
  blogTotal: number | null;
  journeyScore: number;
  finalScore: number;
  inBand: boolean;
  /** ★황금(검색량 100~2,000 · blog_total<500 · 여정 만점) */
  golden: boolean;
  /** ★골드 뱃지(blog_total<300) */
  goldBadge: boolean;
}
export interface KeywordResult { main: KeywordCand; subs: KeywordCand[]; all: KeywordCand[]; articleType: ArticleType }

export type ArticleType = "problem-solve" | "compare" | "how-to-choose" | "season-preempt";

export interface PsychBrief {
  scene: string; // 방금 무슨 일을 겪었나
  fears: string[]; // 가장 두려워하는 것
  buySignals: string[]; // 무엇을 확인하면 사는가
  exitMoments: string[]; // 이탈하는 순간
  sectionMissions: { section: string; mission: string }[];
}

export interface ReviewMining {
  /** 리뷰 유래 검색어 후보(1b) — 다음 글감의 씨앗, keyword_candidates 적재용 */
  searchPhrases?: string[];
  /** ★A-1(라운드1): 코드가 직접 센 붙여넣기 표본 건수 — 모든 '분석했다' 주장은 이 숫자만 쓴다 */
  sampleSize: number;
  /** 별점 1~3 부정 리뷰 감지 수(A-2 경고용) */
  negativeCount: number;
  totalParsed: number;
  satisfactionTop3: { point: string; mentions: number }[];
  complaintsTop2: { point: string; mentions: number }[];
  vividPhrases: string[]; // 반복 등장 구체 표현(15자 이내로 잘라 인용)
  buyContexts: { context: string; share: string }[];
}

export interface ArticleDraft {
  titleSearch: string; // 검색 최적화안
  titleHook: string; // 홈판 훅안
  body: string; // 플레인 텍스트(마커 포함)
  tags: string[];
}

export interface GateIssue { rule: string; detail: string }
export interface QualityResult { pass: boolean; issues: GateIssue[] }

export interface PipelineOutput {
  product: Product;
  gate: GateResult;
  keywords: KeywordResult;
  brief: PsychBrief;
  reviews: ReviewMining;
  article: ArticleDraft;
  cards: { file: string; kind: string }[];
  quality: QualityResult;
  outDir: string;
}
