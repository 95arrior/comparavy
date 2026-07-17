// ★편집력 레이어 가드 — 판단은 분석에서만(경험 지어내기 절대 금지).
//  허용: "조건만 보면 A가 유리해요", "저라면 B부터 확인합니다"(분석 판단)
//  금지: "제가 써보니/직접 해보니/사용해 보니/받아 보니"(개인 경험 조작)
const FABRICATED_RE = /(제가|내가|직접)\s*(써|사용해|이용해|해|받아|먹어|가|신청해)\s*(보니|봤|보았|본\s*결과)|사용해\s*보니|써\s*보니까|받아\s*보니|이용해\s*본\s*후기/;
export function hasFabricatedExperience(html: string): boolean {
  const text = html.replace(/<[^>]+>/g, " ");
  return FABRICATED_RE.test(text);
}

// ★해석 문단 게이트(2026-07-17 전략 회의 — AI 검색 시대: 정보 나열만 있는 글은 AI 요약이 종결시켜 클릭이 안 남는다).
//  '이 제도·수치가 독자 개인에게 뭐가 달라지는지' 해석·판단 신호가 바닥(3회) 미만이면 뉴스 요약체로 간주.
//  프롬프트(VERTICAL_SYSTEM.online)는 방향, 이 게이트는 한계선 — 품질 심사가 아니라 최소선만 본다.
const INTERPRET_RE = /(유리(해|합니다|한\s*편)|불리(해|합니다)|달라(져요|집니다|지는)|영향(?![력권])|체감|내\s*(경우|상황)|해당(돼요|됩니다|된다면|하는\s*분)|놓치면|챙길\s*수\s*있)/g;
export function lacksInterpretation(html: string): boolean {
  const text = html.replace(/<[^>]+>/g, " ");
  return (text.match(INTERPRET_RE)?.length ?? 0) < 3;
}
