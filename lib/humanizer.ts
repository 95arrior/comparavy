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

/**
 * ★'읽는 분량'만 센다(2026-08-03 유저 실측: 화면엔 2,917자인데 실제 본문은 2,603자였다).
 *
 * countKoreanChars는 태그와 공백만 빼고 나머지를 전부 센다 — 그래서 발행되면 글자가 아닌 것들이
 * 분량에 섞여 들어간다:
 *  · [사진:·카드:·차트: …] 슬롯 마커 — 발행 시 이미지로 치환된다(글자로 남지 않는다)
 *  · 해시태그 — 네이버에서 본문 분량으로 치지 않는다
 *  · URL — 링크 버튼으로 들어간다
 * 이걸 같이 세면 목표 1,800자가 실제로는 '본문 1,500자 + 부속물 300자'가 되어 의도와 달라진다.
 * ★분량 판정(상한·예산)과 화면 표시는 전부 이 함수를 쓴다. 원본 카운터는 남겨 두되 분량엔 안 쓴다.
 */
export function countBodyChars(html: string): number {
  const text = String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[(사진|카드|차트)\s*:[^\]]*\]/g, " ") // 슬롯 마커(발행 시 이미지가 된다)
    .replace(/\[[^\]]{0,40}(자리|삽입)[^\]]{0,20}\]/g, " ") // [전편 링크 자리]·[이미지 N — 여기에 삽입] 류 안내 마커
    .replace(/https?:\/\/\S+/g, " ") // URL
    .replace(/#[^\s#]+/g, " ") // 해시태그
    .replace(/[─━]+/g, " ") // 구분선 문자
    .replace(/\s+/g, "");
  return text.length;
}
