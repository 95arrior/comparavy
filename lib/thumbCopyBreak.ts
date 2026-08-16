// ★썸네일 문구 개행(유저 규격) — 1줄 최대 9자·최대 2줄, 어절 경계에서만 분할(단어 중간 절단 금지).
// ★의미 경계 보강(2026-07-16 유저 실측 2건: "같은 1000만/원 금리로 두 배", "채무탕감 신청/전 내 자격부터" —
//  단위(원)·의존명사(전)가 다음 줄 머리로 떨어짐): ①숫자+단위는 병합 ②의존어 줄머리 분할은 강한 감점.
// ★역할 분리 판정(2026-07-17 유저 확정 — "썸네일은 질문을 던지고 제목이 답한다. 제목 반복=실격. 제목과 썸네일이 하나의 문장이 되게"):
//  문구가 제목·키워드와 공유하는 2자+ 실질 어절 수. 앵커 1개(연도·핵심 숫자 등)는 허용, 2개부터 '제목 축약 반복'으로 본다.
export function titleOverlapCount(copy: string, titleAndKeyword: string): number {
  const norm = (s: string) => (s || "").split(/[\s,·…?!."'“”]+/).map((t) => t.replace(/[^가-힣a-zA-Z0-9%]/g, "")).filter((t) => [...t].length >= 2);
  const titleToks = norm(titleAndKeyword);
  let n = 0;
  for (const tok of new Set(norm(copy))) {
    if (titleToks.some((k) => tok === k || (k.length >= 3 && tok.includes(k)) || (tok.length >= 3 && k.includes(tok)))) n += 1; // 포함 관계(3자+) — 접두만 보면 '소상공인정책자금' 속 '정책자금'을 놓친다(실측 2026-07-19)
  }
  return n;
}

/** 역할 분리 종합 판정 — 문구가 '제목과 경쟁'하면 true(실격).
 *  규칙(2026-07-17 유저 예시 기준): ①키워드의 비숫자 핵심 토큰이 문구에 있으면 실격(주제 특정은 병기되는 제목의 몫 —
 *  '에이전트H 모르면 손해본다' 유형) ②제목과 겹치는 어절 3개 이상 = 제목 축약 반복. 숫자·연도 앵커 1~2개는 허용('2027년' 단독 ✓). */
export function repeatsTitle(copy: string, title: string, keyword: string): boolean {
  const clean = (t: string) => t.replace(/[^가-힣a-zA-Z0-9%]/g, "");
  const copyToks = (copy || "").split(/[\s,·…?!."'“”]+/).map(clean).filter((t) => [...t].length >= 2);
  const kwToks = (keyword || "").split(/[\s,·]+/).map(clean).filter((t) => [...t].length >= 2 && !/^\d/.test(t));
  const hitsKw = copyToks.some((c) => kwToks.some((k) => c === k || (k.length >= 3 && c.includes(k)) || (c.length >= 3 && k.includes(c)))); // 포함 관계(3자+) — 복합 키워드 속 핵심 명사('정책자금')까지 잡는다
  if (hitsKw) return true;
  return titleOverlapCount(copy, `${title} ${keyword}`) >= 3;
}

const UNIT_MERGE_RE = /(\d[\d,.]*[만억천]?)\s+(원|명|개|배|년|월|일|살|번|위|시간|분)(?=\s|$)/g;
const BOUND_HEAD_RE = /^(원|전|후|중|시|것|수|만|억|배|개|명|위|살|번|곳|데|때|줄|뿐|채|만큼)(이|가|은|는|을|를|도|의|에|로|만)?$/; // 줄머리에 오면 어색한 의존어('내'는 소유격 줄머리가 자연스러워 제외). ★곳·데·때 추가(2026-08-11 실측: "1만명 잘 / 곳이 없다" — '잘 곳'이 관형형+의존명사 한 몸인데 균형 점수가 갈라놨다)
// ★줄꼬리 금지어(2026-07-17 실측: "2027년 내 / 비서가 생깁니다" — 소유격 '내'가 윗줄 꼬리에 매달림) —
//  소유격·관형사는 다음 어절과 한 몸이라 줄 끝에 오면 어색하다. 줄꼬리 분할은 강한 감점.
const BOUND_TAIL_RE = /^(내|그|이|저|내가|우리|첫|한|두|세|네|새|온|올|이런|그런|저런|어떤)$/;
export function breakThumbCopy(text: string): string {
  const t = (text || "").trim().replace(/\s+/g, " ").replace(UNIT_MERGE_RE, "$1$2")
    // ★띄어 온 조사 붙이기(2026-08-11 실측: "잘 곳 이 없다" — 조사가 홀로 떨어지면 어느 분할이든 어색하다)
    .replace(/([가-힣]+)\s+(이|가|은|는|을|를|와|과|도|의)(?=\s|$)/g, "$1$2");
  const chars = [...t];
  if (chars.length <= 9 || !t.includes(" ")) return t;
  const words = t.split(" ");
  if (words.length === 1) return t;
  // 1줄이 9자를 넘지 않는 분할점 중 두 줄 균형이 가장 좋은 곳 — 의미 경계 감점이 9자 미세 초과보다 무겁다
  let best = -1, bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" "), b = words.slice(i).join(" ");
    const la = [...a].length, lb = [...b].length;
    const fits = la <= 9 && lb <= 9;
    const nearFit = la <= 10 && lb <= 10; // 1자 초과는 렌더러가 미세 축소로 흡수
    const boundPenalty = (BOUND_HEAD_RE.test(words[i]!) ? 120 : 0) + (BOUND_TAIL_RE.test(words[i - 1]!) ? 120 : 0); // 의존어 줄머리·소유격 줄꼬리 — 사실상 금지
    const diff = Math.abs(la - lb) + (fits ? 0 : nearFit ? 40 : 100) + boundPenalty;
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  }
  if (best < 1) best = 1;
  return `${words.slice(0, best).join(" ")}\n${words.slice(best).join(" ")}`;
}
