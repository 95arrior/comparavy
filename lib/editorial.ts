// ★편집력 레이어 가드 — 판단은 분석에서만(경험 지어내기 절대 금지).
//  허용: "조건만 보면 A가 유리해요", "저라면 B부터 확인합니다"(분석 판단)
//  금지: "제가 써보니/직접 해보니/사용해 보니/받아 보니"(개인 경험 조작)
const FABRICATED_RE = /(제가|내가|직접)\s*(써|사용해|이용해|해|받아|먹어|가|신청해)\s*(보니|봤|보았|본\s*결과)|사용해\s*보니|써\s*보니까|받아\s*보니|이용해\s*본\s*후기/;
export function hasFabricatedExperience(html: string): boolean {
  const text = html.replace(/<[^>]+>/g, " ");
  return FABRICATED_RE.test(text);
}
