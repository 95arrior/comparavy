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
}

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

const TONE_VALUES = new Set(TONE_CHOICES.map((c) => c.value));
const TYPE_VALUES = new Set(TYPE_CHOICES.map((c) => c.value));
const PUBLISH_VALUES = new Set(PUBLISH_CHOICES.map((c) => c.value));

export function isTone(v: unknown): boolean { return typeof v === "string" && TONE_VALUES.has(v as never); }
export function isType(v: unknown): boolean { return typeof v === "string" && TYPE_VALUES.has(v as never); }
export function isPublishMode(v: unknown): boolean { return typeof v === "string" && PUBLISH_VALUES.has(v as never); }

/** 프로필 유형(info/guide) → 생성엔진 type 키. (현재 둘 다 howto 구조; 2-C에서 세분 예정) */
export function toEngineType(articleType: string): string {
  return articleType === "guide" ? "howto" : "howto";
}
