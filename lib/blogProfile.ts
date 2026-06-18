// 블로그 프로필 — 온보딩 1회 저장. 이후 모든 글이 이 설정(문체/유형)을 따른다.
// tone은 생성엔진 키(friendly/professional/informative)를 그대로 저장, article_type은 의미값(info/guide)으로 저장 후 생성 시 매핑.

export interface BlogProfile {
  topic: string; // 키워드 발굴 검색어 (세부 또는 대분류)
  category: string | null; // 대분류 (예: 재테크)
  blog_name: string | null; // 블로그 이름 (예: 월급쟁이 부동산 일기)
  tone: string; // friendly | professional | informative (생성엔진 키)
  article_type: string; // 'info' | 'guide' (의미값)
  target: string | null;
  publish_mode: string; // 'manual' | 'auto'
  vertical: string; // 업종 — medical | academy | professional | b2b | general (기본값)
  sub_category: string | null; // 세부 분류(치과/영어/세무사/카페 등 · 직접입력 자유텍스트 포함)
  // 업체 정보(선택) — 입력 시 글 하단 NAP 박스로 자동 삽입(PIVOT 6). 비면 미삽입.
  biz_name: string | null;
  biz_address: string | null;
  biz_phone: string | null;
  biz_hours: string | null; // 레거시 자유입력(fallback)
  biz_hours_json: WeeklyHours | null; // 요일별 구조화 영업시간(우선)
  biz_strength: string | null; // 강점·특징(선택) — 글 마무리 업장 연결에만 사용, 과장은 생성 단계서 순화
}

// 요일별 영업시간 구조
export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];
export const DAY_LABELS: Record<DayKey, string> = { mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일" };
export interface DayHours {
  closed?: boolean; // 휴무
  open?: string; // "HH:MM"
  close?: string; // "HH:MM"
  breakStart?: string; // 점심 시작(옵션)
  breakEnd?: string; // 점심 종료(옵션)
}
export type WeeklyHours = Partial<Record<DayKey, DayHours>>;

/** 문체 선택지 (label=화면, value=생성엔진 tone 키) */
export const TONE_CHOICES = [
  { value: "friendly", label: "친근한 존댓말" },
  { value: "professional", label: "정중한 존댓말" },
  { value: "informative", label: "전문가 톤" },
] as const;

/** 유형 선택지 (의미값 저장) */
export const TYPE_CHOICES = [
  { value: "info", label: "정보형" },
  { value: "guide", label: "가이드형" },
] as const;

/** 발행 모드 선택지 */
export const PUBLISH_CHOICES = [
  { value: "manual", label: "매일 1터치", hint: "매일 ‘발행 준비됐어요’ → 한 번 눌러 발행" },
  { value: "auto", label: "완전 자동", hint: "생성되면 바로 발행" },
] as const;

/** 업종(vertical) 선택지 (label=화면, value=DB 저장값). 기본값 general. */
export const VERTICAL_CHOICES = [
  { value: "medical", label: "병의원" },
  { value: "academy", label: "학원·교습소" },
  { value: "professional", label: "전문직(법무·세무·노무)" },
  { value: "b2b", label: "B2B 서비스" },
  { value: "general", label: "기타·일반" },
] as const;

const TONE_VALUES = new Set(TONE_CHOICES.map((c) => c.value));
const TYPE_VALUES = new Set(TYPE_CHOICES.map((c) => c.value));
const PUBLISH_VALUES = new Set(PUBLISH_CHOICES.map((c) => c.value));
const VERTICAL_VALUES = new Set(VERTICAL_CHOICES.map((c) => c.value));

export function isTone(v: unknown): boolean { return typeof v === "string" && TONE_VALUES.has(v as never); }
export function isType(v: unknown): boolean { return typeof v === "string" && TYPE_VALUES.has(v as never); }
export function isPublishMode(v: unknown): boolean { return typeof v === "string" && PUBLISH_VALUES.has(v as never); }
export function isVertical(v: unknown): boolean { return typeof v === "string" && VERTICAL_VALUES.has(v as never); }

/**
 * 업종별 기본 톤·유형 (ARTICLE_TYPES/TONES 키 재활용).
 * 생성 시 요청에 tone/type이 '없을 때만' 폴백으로 적용된다(사용자 명시값 우선).
 * general은 매핑 없음 → 현행 동작 100% 유지.
 */
export const VERTICAL_DEFAULTS: Record<string, { tone: string; type: string }> = {
  medical: { tone: "professional", type: "howto" },
  academy: { tone: "friendly", type: "howto" },
  professional: { tone: "professional", type: "howto" },
  b2b: { tone: "professional", type: "comparison" },
};

/**
 * 업종별 기본 topic 라벨. 토스식 온보딩은 카테고리를 안 받으므로, topic(NOT NULL)을 이 라벨로 자동 채운다.
 * 키워드 자동검색은 Stage 3에서 제거되어 라벨은 기본값·표시용 의미만.
 */
export const VERTICAL_TOPIC: Record<string, string> = {
  medical: "건강",
  academy: "교육",
  professional: "세무·법률",
  general: "생활정보",
};

/**
 * 프로필 유형(info/guide) → 생성엔진 type 키. vertical을 고려한다.
 * - b2b → comparison, 그 외 전문업종 → howto (VERTICAL_DEFAULTS.type)
 * - general/미지정 → 현행 그대로(howto)
 */
export function toEngineType(articleType: string, vertical?: string): string {
  if (vertical && VERTICAL_DEFAULTS[vertical]) return VERTICAL_DEFAULTS[vertical].type;
  return articleType === "guide" ? "howto" : "howto";
}
