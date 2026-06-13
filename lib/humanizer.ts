import { KOREAN_CLICHES } from "./articlePrompt";

// 생성된 한국어 글을 더 사람답게 만들기 위한 규칙 모음.
// 영어용 규칙(contraction, "And/But" 시작 등) 대신 한국어 자연스러움 기준을 쓴다.
export const HUMANIZER_RULES: string = [
  "문장 길이를 일부러 변주한다 — 짧은 문장과 긴 문장을 섞는다.",
  "같은 어미('~습니다', '~합니다')를 연속으로 반복하지 않는다.",
  "번역투 표현을 피한다 ('~에 다름 아니다', '~할 필요가 있다'의 남발 등).",
  "접속사로 모든 문장을 시작하지 않는다.",
  "구체적인 명사·동사를 쓰고, 막연한 수식어('다양한', '많은')를 줄인다.",
  "정직성 유지: 없는 통계·후기·1인칭 경험을 지어내지 않는다.",
].join("\n");

/** 본문에 등장하는 금지 상투어 목록을 반환한다. */
export function detectCliches(text: string): string[] {
  const found: string[] = [];
  for (const cliche of KOREAN_CLICHES) {
    if (text.includes(cliche)) found.push(cliche);
  }
  return found;
}

/** HTML 태그·공백을 제외한 순수 한국어 글자수를 센다. */
export function countKoreanChars(html: string): number {
  const text = html
    .replace(/<[^>]+>/g, "") // 태그 제거
    .replace(/\s+/g, ""); // 공백 제거
  return text.length;
}
