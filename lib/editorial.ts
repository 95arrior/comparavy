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

// ★내 조건 분기 게이트(2026-07-29 전략 회의 — 네이버 AI 브리핑 인용 실측 2,900회 vs 월 방문 3,300명).
//  진단: 인용은 대성공인데 클릭이 안 남는다(제로클릭). AI 브리핑은 '일반적인 답'을 잘 만들지만
//  '내 조건이면 얼마인가'는 못 만든다 — 조건별로 답이 갈리는 표나 숫자 계산 예시가 그 자리다.
//  둘 중 하나도 없으면 브리핑이 요약으로 종결시키고 글은 인용만 되고 버려진다.
//  프롬프트는 방향, 이 게이트는 한계선(CLAUDE.md) — 품질 심사가 아니라 최소선 하나만 본다.
const COND_AXIS_RE = /(이하|이상|미만|초과|구간|연봉|총급여|소득|연령|나이|세대|가구|무주택|보유\s*기간|가입\s*기간|근속|등급|유형별|조건별|대상별)/;
const NUM_UNIT_RE = /\d[\d,.]*\s*(원|만\s?원|억|%|퍼센트|년|개월|일)/;
const CALC_CASE_RE = /(예를\s*들어|예시로|가정하면|가정\s*[—-]|계산해?\s*보면|계산하면|로\s*계산|이라면\s*얼마)/;

/** 조건 축(소득·연령·기간 등)으로 답이 갈리는 표가 있는가 — 머리행 포함 3행 이상 + 조건 축 + 숫자. */
function hasConditionTable(html: string): boolean {
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];
  return tables.some((t) => {
    const rows = t.match(/<tr/gi)?.length ?? 0;
    const text = t.replace(/<[^>]+>/g, " ");
    return rows >= 3 && COND_AXIS_RE.test(text) && NUM_UNIT_RE.test(text);
  });
}

/** 숫자를 넣어 답이 나오는 계산 예시가 있는가 — '예를 들어 총급여 4,500만 원이면 …' 결. */
function hasCalcExample(html: string): boolean {
  const text = html.replace(/<[^>]+>/g, " ");
  if (!CALC_CASE_RE.test(text)) return false;
  // 계산 신호 주변에 숫자+단위가 실제로 있어야 한다(빈 '예를 들어'는 예시가 아니다)
  const idx = text.search(CALC_CASE_RE);
  return NUM_UNIT_RE.test(text.slice(idx, idx + 400));
}

export function lacksConditionBranch(html: string): boolean {
  return !hasConditionTable(html) && !hasCalcExample(html);
}
