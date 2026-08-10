// ★편집력 레이어 가드 — 판단은 분석에서만(경험 지어내기 절대 금지).
//  허용: "조건만 보면 A가 유리해요", "저라면 B부터 확인합니다"(분석 판단)
//  금지: "제가 써보니/직접 해보니/사용해 보니/받아 보니"(개인 경험 조작)
//  ★2026-08-03 보강(유저 실물에서 검거): 1인칭 판단을 허용한 직후 도입부가 이렇게 나왔다 —
//   "대출 심사에서 떨어지고 나서야, 내 신용정보를 처음 들여다봤습니다."
//   이건 판단이 아니라 겪은 일이다. 종전 패턴은 '제가 ~해 보니' 꼴만 봐서 주어를 생략하면 통과했다.
//   ★내가 1인칭 문을 열었으니 그 문으로 뭐가 나올 수 있는지도 같이 막아야 한다.
//   경계는 그대로다: 숫자를 보고 내릴 수 있으면 판단(허용), 겪어야만 알 수 있으면 경험(금지).
const FABRICATED_RE = /(제가|내가|직접)\s*(써|사용해|이용해|해|받아|먹어|가|신청해)\s*(보니|봤|보았|본\s*결과)|사용해\s*보니|써\s*보니까|받아\s*보니|이용해\s*본\s*후기|(들여다|열어|겪어|당해|찾아가)\s?봤(습니다|어요|다|고|는데)|나서야\s*[^.!?]{0,30}(봤|았|었)습니다|처음\s*(들여다|열어)\s?봤/;
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

// ═══ 어색한 감탄사(2026-08-04 유저: "말투 허참. 이런 쓰지마요 이상해요 자연스럽게") ═══
//  실물: 본문에 '허참' 같은 옛날 말투 감탄사가 섞였다. 요즘 사람이 안 쓰는 말이 한 번 나오면
//  그 글 전체가 '사람이 안 쓴 글'로 읽힌다 — 우리가 가장 피하려는 신호다.
//  ★프롬프트로 "자연스럽게"라고 해봐야 모델은 매번 다른 말로 돌아온다. 목록을 코드가 들고 지운다.
//   지우는 방식은 보수적으로: 문장 첫머리에서 감탄사 + 뒤따르는 쉼표·공백만 걷어낸다(문장은 그대로 산다).
const STILTED_WORDS = ["허참", "거참", "원참", "허허", "어허", "어이쿠", "아이쿠", "아뿔싸", "이런이런", "에구머니", "어머나", "자자"];
const STILTED_LEAD_RE = new RegExp(`(^|>|<br\\s*/?>|[.!?]\\s*)\\s*(?:${STILTED_WORDS.join("|")})\\s*[,，!]?\\s*`, "g");
/** 본문에 남아 있는 어색한 감탄사들(경고용). */
export function stiltedInterjections(html: string): string[] {
  const text = stripTags(html);
  return [...new Set(STILTED_WORDS.filter((w) => new RegExp(`(^|[\\s>,.!?"'(])${w}`).test(text)))];
}
/** 문장 첫머리 감탄사만 걷어낸다 — 문장 자체는 건드리지 않는다. */
export function stripStilted(html: string): string {
  return String(html || "").replace(STILTED_LEAD_RE, "$1");
}

// ═══ 본문 즉답 이행(2026-08-04 확정 — 퀵백 대응) ═══
//  배경: 제목을 '답을 숨기고 궁금하게'로 강하게 만들수록 클릭은 오르지만, 본문 첫 화면이 답을 안 주면
//  독자는 즉시 뒤로 간다. 네이버는 그 '퀵백'을 감점으로 읽는다 — 클릭을 올리는 장치가 감점 장치가 된다.
//  ★프롬프트엔 이미 '리드 즉답'이 있었다. 그런데 부탁이었다 — 지켜졌는지 아무도 안 쟀다.
//  ('바쁘면 이것만' 블록은 2026-08-07 폐기 — 도입부가 조건·행동까지 다 퍼주면 체류가 죽는다.
//   그래서 아래 hasBoldLead는 이제 '있어도 되는 보조 신호'가 아니라 과거 글 호환용일 뿐이다.)
//  ★코드는 의미를 못 읽는다. 그래서 '답이 있는가'를 직접 묻지 않고, 답이 있을 때 반드시 남는 흔적을 센다:
//   ①메타 안내로 시작하지 않았는가 ②도입부에 판결·수치 신호가 있는가 ③답이 늦지 않았는가(도입부 길이).
//  이 셋은 기계적으로 판정 가능하고, 통과했는데 답이 없는 글은 사실상 만들기 어렵다.
const ANSWER_META_RE = /(알아보겠습니다|살펴보겠습니다|살펴볼게요|알아볼게요|정리해\s?보겠습니다|정리해\s?봤습니다|소개하겠습니다|설명드리겠습니다|이야기해\s?볼게요|다뤄보겠습니다)/;
// 판결·행동 신호(결론이 앞에 왔을 때 남는 말투)
const ANSWER_VERDICT_RE = /(결론부터|먼저\s|우선\s|바로\s|~?하면\s?됩니다|하시면\s?됩니다|유리|불리|가능합니다|어렵습니다|해당(?:됩니다|돼요|되지)|받을\s?수\s?있|신청하면|기준입니다|입니다\.|이에요\.|예요\.)/;
// 수치 신호(금액·비율·기간 — 이 블로그에서 결론은 거의 항상 숫자를 동반한다)
const ANSWER_FIGURE_RE = /\d[\d,.]*\s*(?:원|만\s?원|억|%|퍼센트|년|개월|주|일|배|회|명|건|세)/;
/** 첫 <h2> 이전(도입부) HTML. h2가 없으면 앞 1,200자를 도입부로 본다. */
function introOf(html: string): string {
  const h = String(html || "");
  const i = h.search(/<h2[\s>]/i);
  return i > 0 ? h.slice(0, i) : h.slice(0, 1200);
}
export const INTRO_MAX_CHARS = 500; // 인용구 1문장 + 리드 3문장 ≈ 270자('바쁘면 이것만' 폐기 후). 500이면 명백히 늦은 것.
/** 본문이 '즉답 이행'을 어겼는가 — 어겼으면 사유들, 지켰으면 빈 배열. */
export function answerFirstDefects(html: string): string[] {
  const intro = introOf(html);
  const plainAll = stripTags(intro).replace(/\s+/g, " ").trim();
  if (!plainAll) return ["도입부가 비었다"];
  const out: string[] = [];
  if (ANSWER_META_RE.test(plainAll)) out.push("도입부가 '~알아보겠습니다' 류 메타 안내로 시작한다(답이 아니라 예고다)");
  // 인용구(문제 제기 담당)는 답 신호에서 제외한다 — 그 자리는 원래 아픔만 찌르는 자리다.
  const afterQuote = stripTags(intro.replace(/<blockquote[\s\S]*?<\/blockquote>/gi, " ")).replace(/\s+/g, " ").trim();
  const hasFigure = ANSWER_FIGURE_RE.test(afterQuote);
  const hasVerdict = ANSWER_VERDICT_RE.test(afterQuote);
  const hasBoldLead = /<b[^>]*>[\s\S]{6,}?<\/b>/i.test(intro.replace(/<blockquote[\s\S]*?<\/blockquote>/gi, " ")); // '바쁘면 이것만' 규격
  if (!hasFigure && !hasVerdict && !hasBoldLead) out.push("도입부에 결론(판결·수치·강조 결론 블록)이 하나도 없다");
  if ([...plainAll].length > INTRO_MAX_CHARS) out.push(`첫 소제목까지 ${[...plainAll].length}자다 — 답이 늦다(${INTRO_MAX_CHARS}자 안에 결론이 나와야 한다)`);
  return out;
}
export function lacksAnswerFirst(html: string): boolean {
  return answerFirstDefects(html).length > 0;
}

// ═══ 메인 키워드 출현 하한·상한(2026-08-02 유저 확정: "제목 메인키워드는 무조건 본문에 5번 이상") ═══
//  배경: 네이버 AI 브리핑·검색이 이 글을 '무엇에 관한 글'로 판정하려면 키워드가 본문에 실재해야 한다.
//  ★그동안 우리에겐 상한만 있었다("억지 반복 금지") — 하한이 없으니 2~3회로 말라도 아무도 몰랐다.
//   그래서 양쪽을 박는다. 1,400~2,100자 글에서 5회는 도배가 아니라 정상 밀도다(6자 키워드면 약 1.5~2%).
//   상한은 그대로 지킨다 — 과최적화는 여전히 저품질 신호다.
export const KEYWORD_FLOOR = 5;          // 본문 원형 출현 하한(유저 확정)
export const KEYWORD_DENSITY_MAX = 0.025; // 밀도 상한 2.5% — 넘으면 도배
export const KEYWORD_COUNT_MAX = 12;      // 절대 개수 상한(짧은 글에서 밀도가 먼저 걸리게 두되 안전판)

const stripTags = (html: string): string => String(html || "").replace(/<[^>]+>/g, " ");

/** 본문에 메인 키워드 원형이 몇 번 나오는가. 공백 차이는 같은 것으로 본다('연말정산 환급'≡'연말정산환급'). */
export function keywordOccurrences(html: string, keyword: string): number {
  const kw = String(keyword || "").replace(/\s+/g, "");
  if ([...kw].length < 2) return 0;
  const text = stripTags(html).replace(/\s+/g, "");
  if (!text) return 0;
  let n = 0;
  let i = text.indexOf(kw);
  while (i !== -1) { n++; i = text.indexOf(kw, i + kw.length); }
  return n;
}

/**
 * ★앵커 문구에서 '셀 수 있는 핵심어'를 뽑는다(2026-08-02 실측 후 추가).
 *  홈판 카드의 keyword는 검색 키워드가 아니라 주제 앵커다 — "7월 미환급금", "월급날 자동이체 함정" 같은 소재 문구.
 *  이런 문구를 본문에 5회 그대로 박으라고 하면 글이 부자연스러워진다(그리고 모델은 못 지킨다).
 *  그래서 홈판 레인에서는 앵커의 최장 토큰('미환급금', '자동이체')을 세는 대상으로 삼는다 —
 *  '이 글이 무엇에 관한 글인지 판정되게 한다'는 하한의 목적은 그대로 달성된다.
 */
export function coreKeywordOf(keyword: string): string {
  const all = String(keyword || "")
    .split(/\s+/)
    .map((t) => t.replace(/[^가-힣a-zA-Z0-9]/g, ""))
    .filter((t) => [...t].length >= 2);
  // ★숫자로 시작하는 토큰은 핵심어가 아니라 수식어다(7월·30대·2026) —
  //  빼지 않으면 "30대 평균 저축액"의 핵심어가 '30대'로 잡혀 엉뚱한 말을 세게 된다(실측).
  const nouns = all.filter((t) => !/^\d/.test(t));
  const pool = nouns.length ? nouns : all;
  if (pool.length === 0) return String(keyword || "").trim();
  return pool.reduce((a, b) => ([...b].length > [...a].length ? b : a));
}

/** 키워드가 하한 미달인가 — 미달이면 이 글은 '무엇에 관한 글'인지 검색엔진이 판정하기 어렵다. */
export function lacksKeywordFloor(html: string, keyword: string, floor = KEYWORD_FLOOR): boolean {
  const kw = String(keyword || "").replace(/\s+/g, "");
  if ([...kw].length < 2) return false; // 키워드가 없거나 너무 짧으면 판정 대상 아님
  return keywordOccurrences(html, keyword) < floor;
}

/** 키워드 도배인가 — 밀도 또는 절대 개수 상한 초과. 하한을 넣었으니 반대쪽도 같이 지킨다. */
export function keywordOverstuffed(html: string, keyword: string): boolean {
  const n = keywordOccurrences(html, keyword);
  if (n === 0) return false;
  if (n > KEYWORD_COUNT_MAX) return true;
  const kwLen = [...String(keyword || "").replace(/\s+/g, "")].length;
  const total = [...stripTags(html).replace(/\s+/g, "")].length;
  if (total < 200) return false; // 너무 짧은 본문은 밀도 판정이 무의미
  return (n * kwLen) / total > KEYWORD_DENSITY_MAX;
}

// ═══ 띄어쓰기 붙음(2026-08-02 발행글 실측) ═══
//  실측: "건강보험 임의계속가입은퇴직 후", "지역가입자로 전환되면서보험료" — 미리보기 24자 안에서만 2건 나왔다.
//  ★이건 사람이 쓴 글에서는 나오지 않는 오류라, 네이버가 기계 생성으로 읽는 대표 신호다.
//  ★그런데 우리 파이프라인에 띄어쓰기 검사가 아예 없었다.
//  한국어 띄어쓰기를 일반적으로 판정하는 건 불가능하다 — 오탐이 나면 멀쩡한 글이 반려된다.
//  그래서 '사람은 절대 안 붙여 쓰는 자리' 네 가지만 고정밀로 잡는다.
const SPACING_PATTERNS: { re: RegExp; why: string }[] = [
  // ① 조사 뒤에 숫자가 붙음 — "연차는1일". 앞이 숫자면 제외("1만1000원"의 '만1').
  { re: /(?<![0-9])[가-힣](?:은|는|이|가|을|를|와|과|로|도|의|에)\d/g, why: "조사 뒤 숫자" },
  // ② 연결어미 뒤에 명사가 붙음 — "전환되면서보험료". 뒤가 1자(조사)면 정상이라 2자 이상만.
  { re: /(?:면서|지만|으며|이며|하며|되며|라서|으로써)[가-힣]{2,}/g, why: "연결어미 뒤 명사" },
  // ③ 숫자+단위 뒤에 명사가 붙음 — "36개월건강보험". 흔한 접미사는 제외한다.
  { re: /\d+\s?(?:년|월|일|원|만원|개월|시간|주)(?!분할|연장|이내|이상|이하|미만|초과|정도|이후|이전|동안|만에|짜리|단위|입|이|였|까지|부터|밖에|남짓|가량|치|간|째|차|분)[가-힣]{2,}/g, why: "수량 뒤 명사" },
  // ④ 긴 어절 한가운데 목적격·주제격 조사 — "임의계속가입은퇴직", "주택담보대출을받는".
  //   조사가 마지막 글자면 정상이므로 제외하고, 흔한 합성어 오탐을 피하려 '이/가'는 넣지 않는다.
  { re: /(?<![가-힣])[가-힣]{3,}(?:은|는|을|를)[가-힣]{2,}(?![가-힣])/g, why: "어절 중간 조사" },
];

/** 붙여 쓴 자리 목록(중복 제거, 최대 8). 빈 배열이면 통과. */
export function spacingDefects(html: string): string[] {
  const text = stripTags(html).replace(/\s+/g, " ");
  const hits: string[] = [];
  for (const { re } of SPACING_PATTERNS) {
    for (const m of text.matchAll(re)) {
      const v = m[0].trim();
      if (v && !hits.includes(v)) hits.push(v);
    }
  }
  return hits.slice(0, 8);
}

export function hasSpacingDefect(html: string): boolean {
  return spacingDefects(html).length > 0;
}

// ═══ 문단 길이(2026-08-02 발행글 실측: 69문단 중 9개가 4줄 초과, 최대 7줄) ═══
//  규격은 "한 문단 1~2문장"인데 지켜지지 않았다. 모바일 390px에서 5줄 이상은 벽돌이고,
//  네이버는 모바일이 압도적이라 이게 곧 이탈이다. 프롬프트에만 있던 규칙을 코드로 올린다.
// ★18자(2026-08-06 유저 화면에서 검거: 한 문단이 13줄이었다).
//  종전 23자는 실제 렌더와 달랐다 — 개행 v6는 '한 줄 띄어쓰기 포함 18자'로 감싼다(MOBILE_MAX_CHARS 72 = 18×4).
//  ★재는 자와 그리는 자가 다른 숫자를 보면, 게이트는 통과인데 화면은 벽돌이 된다.
const CHARS_PER_LINE = 18;
export const PARA_MAX_LINES = 3; // ★4→3(2026-08-11 유저: '이런 식으로 나눠주셔야' — 모바일 3줄 넘으면 문단을 쪼갠다)

// ★긴 '문장' 게이트(2026-08-06 유저 화면). 실물: "국토교통부는 … 핵심으로 제시했습니다."가 한 문장으로 13줄이었다.
//  ★문단을 나눠도 못 고치는 종류다 — 개행은 문장 단위로 일어나므로, 문장 자체가 길면 통줄로 남는다.
//  40~70대 독자가 주 타겟이라 한 호흡이 길면 읽다가 놓친다.
export const SENT_MAX_CHARS = 90; // 18자 기준 5줄

// ★강조가 아예 없는 글을 막는다(2026-08-06 유저: "너무 검적색 일반 두께로 쭉 길게 쓰니깐 가독성이 떨어져").
//  상한(형광 2곳)만 있고 하한이 없어서 0개로 나가도 아무도 몰랐다 — 이모지와 같은 병이다.
//  ★타겟이 40~70대라 '어디가 중요한지'가 눈에 안 들어오면 그냥 나간다.
export const BOLD_MIN_PER_1000 = 2;  // 1,000자당 굵은 글씨 최소 2곳
export const MARK_MIN = 3;           // ★2→3(2026-08-11 유저 2차: '아직 많이 부족, 핵심이 묻혀요') — 상한은 4곳
export function emphasisShortfall(html: string): { chars: number; bold: number; mark: number; wantBold: number } | null {
  const h = String(html || "");
  const chars = h.replace(/<[^>]+>/g, "").replace(/\s/g, "").length;
  if (chars < 400) return null; // 너무 짧은 글은 강조가 없어도 읽힌다
  const bold = (h.match(/<(?:b|strong)\b/g) ?? []).length;
  // 형광펜은 표기가 바뀐다(mark / b+background) — 결과(배경색)로 센다(게이트 중앙화 원칙)
  const mark = (h.match(/<mark\b/g) ?? []).length + (h.match(/background(?:-color)?\s*:\s*(?!transparent|none)/gi) ?? []).length;
  const wantBold = Math.max(2, Math.round((chars / 1000) * BOLD_MIN_PER_1000));
  return bold < wantBold || mark < MARK_MIN ? { chars, bold, mark, wantBold } : null;
}
export function longSentences(html: string): { preview: string; chars: number }[] {
  const prose = String(html || "").replace(/<(table|ul|ol)[\s\S]*?<\/\1>/gi, "");
  const out: { preview: string; chars: number }[] = [];
  for (const m of prose.matchAll(/<(p|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const text = m[2]!.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    for (const sent of text.split(/(?<=[.?!])\s+/)) {
      const n = [...sent].length;
      if (n > SENT_MAX_CHARS) out.push({ preview: sent.slice(0, 24), chars: n });
    }
  }
  return out;
}

// ★볼드 남발 검출(2026-08-05 스펙 5-4) — "문단당 최대 1개, 핵심 수치·결론 문장에만".
//  프롬프트에 '섹션당 1문장'이라고 써 뒀지만 재는 코드가 없었다.
//  ★전부 강조하면 아무것도 강조가 아니다 — 이건 모델이 습관적으로 어기는 종류라 코드가 막아야 한다.
export function boldOveruse(html: string): { text: string; count: number }[] {
  const out: { text: string; count: number }[] = [];
  for (const m of String(html || "").matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)) {
    const inner = m[1] ?? "";
    const count = (inner.match(/<(?:b|strong)\b/g) ?? []).length;
    if (count >= 2) out.push({ text: inner.replace(/<[^>]+>/g, "").slice(0, 30), count });
  }
  return out;
}

// ★시각 브레이크 리듬(스펙 5-6) — "3~5문단마다 시각 요소 1회, 순수 텍스트 나열 금지".
//  텍스트만 길게 이어지면 스크롤이 빨라지고, 그 구간에 광고가 있으면 인지도 못 하고 지나간다.
const VISUAL_TAG_RE = /^<(?:h[1-4]|table|ul|ol|blockquote|figure|img|hr)/i;
const IMG_MARKER_RE = /\[(?:사진|카드|차트|브랜드|표|인물)\s*:/;
/** 시각 요소 없이 연속된 산문 문단이 max를 넘는 구간을 돌려준다. */
export function textWallRuns(html: string, max = 5): { at: number; run: number }[] {
  const blocks = String(html || "").match(/<(?:p|h[1-4]|table|ul|ol|blockquote|figure|hr)\b[\s\S]*?<\/(?:p|h[1-4]|table|ul|ol|blockquote|figure)>|<(?:img|hr)\b[^>]*>/g) ?? [];
  const out: { at: number; run: number }[] = [];
  let run = 0, start = 0;
  blocks.forEach((b, i) => {
    const visual = VISUAL_TAG_RE.test(b) || IMG_MARKER_RE.test(b);
    if (visual) { if (run > max) out.push({ at: start, run }); run = 0; return; }
    if (run === 0) start = i;
    run += 1;
  });
  if (run > max) out.push({ at: start, run });
  return out;
}

/** 4줄을 넘는 문단들의 미리보기. 표·리스트·데이터박스는 대상이 아니다(산문 문단만). */
export function longParagraphs(html: string): { preview: string; lines: number }[] {
  const prose = String(html || "").replace(/<(table|ul|ol|div)[\s\S]*?<\/\1>/gi, "");
  return [...prose.matchAll(/<(p|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((m) => m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((t) => ({ preview: t.slice(0, 20), lines: Math.max(1, Math.ceil([...t].length / CHARS_PER_LINE)) }))
    .filter((x) => x.lines > PARA_MAX_LINES);
}

// ═══ 이모지 하한(2026-08-02 발행글 실측: 규격 3~6인데 실제 0개) ═══
//  상한(6)만 코드에 있고 하한이 없어서 0개로 나가도 아무도 몰랐다. 형광펜과 같은 병이다.
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu;
export const EMOJI_MIN = 5;          // ★4→5(2026-08-11 유저 2차: '이모지 수가 많이 부족') — 상한 8(publishHtml EMOJI_CAP과 짝)·리듬 게이트 유지
export function emojiCount(html: string): number {
  return (stripTags(html).match(EMOJI_RE) ?? []).length;
}

// ═══ 사진 슬롯 수(2026-08-02 실측: 마커 3개 = 하한에 딱 붙음) ═══
//  규격은 "하한 3, 상한 min(섹션 수, 7)"인데 섹션이 5개여도 3개만 나온다.
//  네이버는 사진이 체류·노출에 크게 작용하는데 최소로만 나가고 있었다.
export function photoSlotShortfall(html: string): { slots: number; sections: number; want: number; photoOnly: number } | null {
  const h = String(html || "");
  // ★새 마커 3종도 이미지 자리다(2026-08-05). 종전엔 [사진:]만 세서,
  //  브랜드·표·인물로 시각 요소를 충분히 채운 글이 '사진 부족'으로 지적받았다 —
  //  ★그러면 모델이 필요도 없는 [사진:]을 더 넣는다. 마커를 늘리면 '세는 쪽'도 같이 늘려야 한다.
  const slots = (h.match(/\[(?:사진|브랜드|표|인물):/g) ?? []).length;
  const photoOnly = (h.match(/\[사진:/g) ?? []).length;
  const sections = (h.match(/<h2/gi) ?? []).length;
  // ★하한 3 → 5(2026-08-05 유저: "5개 이상 이미지 넣어야 하지 않을까요").
  //  종전 하한은 'AI가 그려 주던 시절' 기준이다. 지금은 유저가 직접 찾아 넣고,
  //  이미지가 체류·광고 시인성을 만든다 — 적으면 텍스트벽이 되고 그 구간에서 이탈한다.
  const want = Math.min(Math.max(5, sections), 8);
  // ★[사진:]은 최소 1장 유지 — 도입부 첫인상은 장면 컷이 맡는다(브랜드 로고로 대신할 수 없다).
  if (slots < want || photoOnly < 1) return { slots, sections, want, photoOnly };
  return null;
}

// ═══ 검색형 제목 = 실검색어 표기 그대로(2026-08-02 유저가 실성과에서 역추적) ═══
//  유저 관찰: "삼성카드 발급조회, 심사중일 때 이렇게 확인하면 됩니다"가 지금도 1페이지·누적 조회 상위다.
//  유저 가설은 '제목에 자동완성 문장이 들어가서'였고, 실측해 보니 기제는 한 겹 더 있었다:
//   ① 자동완성은 랭킹 요인이 아니라 '수요의 증거'다. 네이버가 자동완성 일치를 보고 올려주지는 않는다.
//   ② 실제로 작동한 건 '검색어와 제목 앞부분이 문자 그대로 같다'는 것 — 질의-문서 정합이 최고점이다.
//   ③ ★그래서 자동완성이 결정적인 이유는 따로 있다: 사람들이 실제로 치는 '표기'를 알려준다.
//      실측 예 — 사람들은 '실업급여 조건'이 아니라 '실업급여조건'을 친다(2단 자동완성에 그렇게 뜬다).
//      우리가 보기 좋게 띄어 쓰면 그 정합이 깨진다. 맞춤법보다 실제 표기가 우선이다.
//  ★그래서 검사하는 것: 검색형 제목이 '고른 실검색어'로 시작하는가 + 그 표기를 바꾸지 않았는가.

/** 공백·조사를 지운 비교용 형태 — '실업급여 조건'과 '실업급여조건'을 같은 것으로 본다. */
function compressKo(s: string): string {
  return String(s || "").replace(/\s+/g, "").toLowerCase();
}

export interface SearchTitleReport {
  leads: boolean;        // 제목이 그 검색어로 시작하는가
  contains: boolean;     // 어디든 들어 있기는 한가
  spacingChanged: boolean; // 들어 있지만 띄어쓰기를 바꿨는가(실검색어 표기 훼손)
}

/**
 * 검색형 제목이 실검색어를 '맨 앞에, 표기 그대로' 담았는가.
 * ★홈판(어그로) 제목에는 쓰지 않는다 — 거기는 검색이 아니라 스크롤 싸움이라 규칙이 반대다.
 */
export function searchTitleReport(title: string, phrase: string): SearchTitleReport | null {
  const t = String(title || "").trim();
  const p = String(phrase || "").trim();
  if (!t || !p) return null;
  const tc = compressKo(t), pc = compressKo(p);
  if (!pc || !tc.includes(pc)) return { leads: false, contains: false, spacingChanged: false };
  return {
    leads: tc.startsWith(pc),
    contains: true,
    // 압축하면 같은데 원문 그대로는 없다 = 띄어쓰기를 우리가 바꿨다
    spacingChanged: !t.includes(p),
  };
}

// ═══ 사진 소재 진부함(2026-08-02 유저: "매번 계산기와 급여명세서 클로즈업 이런것만 넣지마") ═══
//  ★두 가지 병이 겹쳐 있었다:
//   ① 프롬프트에 '원천징수영수증과 계산기'를 예시로 적어뒀다 → 모델이 그대로 베꼈다(썸네일에서 겪은 것과 같은 사고).
//   ② 슬롯 2번 역할이 '실제 물건·서류·화면'이라 서류 클로즈업으로 유도했다.
//  게다가 서류·명세서류는 글자가 본질이라 글자를 빼면 빈 종이가 된다 — 우리 이미지 규칙(글자 금지)과 정면 충돌.
//  ★체류시간은 '물건'이 아니라 '장면'이 만든다. 자기 상황이 겹쳐 보여야 스크롤이 멈춘다.
const STOCK_PROPS = [
  "계산기", "급여명세서", "명세서", "원천징수", "영수증", "서류", "고지서", "돋보기",
  "통장", "도장", "신분증", "클립보드", "청구서", "장부", "결재판",
];

/** 진부한 소품이 박힌 사진 슬롯. 하나라도 있으면 결함. */
export function stockPropSlots(html: string): { desc: string; prop: string }[] {
  const out: { desc: string; prop: string }[] = [];
  for (const m of String(html || "").matchAll(/\[사진:\s*([^\]]+)\]/g)) {
    const desc = m[1].trim();
    const prop = STOCK_PROPS.find((w) => desc.includes(w));
    if (prop) out.push({ desc: desc.slice(0, 40), prop });
  }
  return out;
}

/**
 * 사진이 전부 같은 결인가. ★"모든 글이 똑같아 보인다"의 정체는 슬롯 간 차이가 없는 것이다.
 * 장면 신호(사람·장소·행동·시간)가 하나도 없이 물건 나열만 있으면 결함.
 */
const SCENE_HINT = /(손|뒷모습|앞에|위에|들여다|바라보|기다리|줄|창가|책상|주방|식탁|현관|거리|매장|창구|사무실|방|밤|아침|저녁|출근|퇴근|앉아|서서|걸어|열린|정리된)/;

export function photoSceneShortfall(html: string): { slots: number; scenes: number } | null {
  const descs = [...String(html || "").matchAll(/\[사진:\s*([^\]]+)\]/g)].map((m) => m[1]);
  if (descs.length < 2) return null;
  const scenes = descs.filter((d) => SCENE_HINT.test(d)).length;
  return scenes < 1 ? { slots: descs.length, scenes } : null; // 최소 한 장은 장면이어야 한다
}

// ═══ 자격 요건 표 검증(2026-08-04 유저 실측: 데이터 카드의 연령 구간이 틀렸다) ═══
//  실물: '만 18~34세 | 청년미래적금, 청년월세지원, 국민취업지원제도 청년특례'
//  ★셋의 실제 하한이 19·19·15로 서로 다른데 한 행에 묶고 단일 범위를 붙였다 —
//   묶는 순간 어떤 숫자를 써도 틀린다. 그리고 청년기본법 기준은 19세라 '18세'는 어느 제도에도 안 맞는다.
//  ★왜 급한가: 이 표가 그대로 이미지 카드가 된다(인포그래픽은 본문 표를 옮긴다).
//   이미지는 발행 뒤 고치기 어렵고, 자격 요건은 틀리면 독자가 실제로 신청 손해를 본다.
//   유저 3원칙의 '법적 안전'에 걸리는 종류다.
//  ★과교정 방지: 산문의 연령 언급은 보지 않는다. 표 안만 본다.

/** 자격 수치 — 연령 구간·소득 상한처럼 '신청 자격'을 가르는 값. */
const ELIGIBILITY_RE = /(만\s*\d{1,2}\s*[~∼-]\s*\d{1,2}\s*세|\d{1,2}\s*세\s*(이상|이하|미만|초과)|연\s*소득\s*\d|소득\s*\d{1,3}\s*(만\s*원|%)\s*(이하|미만))/;
/** 출처 신호 — 기관명 또는 기준 시점. 이게 있으면 '확인 가능한 값'으로 본다. */
const SOURCE_RE = /(국토교통부|고용노동부|보건복지부|기획재정부|행정안전부|금융위원회|금융감독원|국세청|중소벤처기업부|여성가족부|교육부|국민연금공단|건강보험공단|근로복지공단|주택도시보증공사|서울시|경기도|지자체|공단|공사|\d{4}\s*년\s*\d{1,2}\s*월\s*기준|기준일|공식\s*안내)/;
/** 제도명으로 읽히는 토큰 — 나열 개수를 셀 때 쓴다. */
const PROGRAM_RE = /[가-힣]{2,}(적금|지원|지원금|제도|계좌|수당|급여|바우처|공제|연금|보험|대출|특례|사업)/g;

export interface EligibilityIssue { row: string; why: string }

/**
 * 표 안의 자격 요건 결함을 찾는다. 두 가지만 본다(최소선 — 품질 심사가 아니다):
 *  ① 서로 다른 제도 3개 이상을 한 행에 묶고 단일 연령 구간을 붙인 것
 *  ② 표에 자격 수치가 있는데 그 표 근처에 출처가 없는 것
 */
export function eligibilityTableIssues(html: string): EligibilityIssue[] {
  const h = String(html || "");
  const issues: EligibilityIssue[] = [];
  for (const m of h.matchAll(/<table[\s\S]*?<\/table>/gi)) {
    const table = m[0];
    const at = m.index ?? 0;
    // 표 앞뒤 400자를 '근처'로 본다 — 출처는 보통 표 바로 위나 아래에 적는다.
    const near = stripTags(h.slice(Math.max(0, at - 400), at + table.length + 400));
    const hasSource = SOURCE_RE.test(near);

    for (const r of table.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
      const cells = [...r[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => stripTags(c[1]).trim());
      if (cells.length < 2) continue;
      const rowText = cells.join(" | ");
      if (!ELIGIBILITY_RE.test(rowText)) continue;

      // ① 여러 제도를 한 행에 묶었는가 — 제도명이 3개 이상이면 하한이 다를 수밖에 없다
      const programs = new Set((rowText.match(PROGRAM_RE) ?? []).map((x) => x.trim()));
      if (programs.size >= 3) {
        issues.push({
          row: rowText.slice(0, 60),
          why: `제도 ${programs.size}개를 한 행에 묶고 단일 자격 구간을 붙였다(${[...programs].slice(0, 3).join(", ")}…). 제도마다 하한이 달라 어떤 숫자를 써도 틀린다 — 제도별로 행을 나누거나, 자격 구간 열을 빼고 '제도별 상이'로 쓴다`,
        });
        continue; // 같은 행에서 ②까지 중복 지적하지 않는다
      }
      // ② 자격 수치인데 출처가 없는가
      if (!hasSource) {
        issues.push({
          row: rowText.slice(0, 60),
          why: "자격 수치(연령·소득)인데 표 근처에 근거 기관·기준 시점이 없다. 표 바로 아래에 '출처: 기관명 · YYYY년 M월 기준'을 적거나, 확인이 안 되면 그 열을 빼라 — 자격은 틀리면 독자가 신청 손해를 본다",
        });
      }
    }
  }
  return issues.slice(0, 4);
}

// ═══ 함께 보면 좋은 글 — 코드가 보장한다(2026-08-04 유저 확정) ═══
//  ★종전엔 모델이 [마무리관련글:] 마커를 써야 링크가 나왔다. 안 쓰면 0개다 —
//   실제로 링크가 통째로 빠지는 글이 계속 나왔다. 부탁이 아니라 실행이어야 한다.
//  ★유저 확정: 설명 문장 없이, 연관 판정 없이, 2~3개 고정.
//   근거: 링크 카드는 네이버 편집기에서 본문 분량을 안 먹는다 — 넣어서 잃을 게 없다.
//   그리고 재테크 블로그의 최근 글은 어차피 대부분 재테크라, 판정 없이 뽑아도 크게 안 어긋난다.
//  ★2026-08-04 재발 — 그 '보장'이 모델에게 또 뚫렸다(유저 실물: 링크 자리에 대괄호 원문 3줄).
//   모델이 URL 없는 껍데기 `[마무리관련글: | 제목]`을 세 개 써 놨고, 개수만 세던 아래 코드가
//   "이미 2개 이상 있으니 손대지 않는다"로 판단해 진짜 링크를 붙이지 않았다.
//   URL이 없으니 렌더러의 변환 정규식(https? 필수)도 못 잡아 마커가 원문 그대로 독자에게 갔다.
//  ★그래서 정책을 바꾼다: 이 자리의 마커는 100% 코드가 만든다. 모델이 쓴 마무리 마커는
//   유효하든 아니든 전부 버린다(프롬프트가 이미 '쓰지 마라'인 자리다 — 두 곳이 다투면 지는 쪽은 늘 독자).
/** 본문에서 마무리 관련글 마커를 문단째 걷어낸다(모델이 쓴 것 = 전부 무효). */
export function stripFinalRelatedMarkers(html: string): string {
  return String(html || "")
    // 마커만 든 문단은 문단째로 — 빈 <p>를 남기면 여백만 뜬다
    .replace(/<p[^>]*>\s*\[마무리관련글:[^\]]*\]\s*<\/p>/g, "")
    .replace(/\[마무리관련글:[^\]]*\]/g, "");
}

export function ensureRelatedLinks(html: string, posts: { title: string; url: string }[]): string {
  const h = stripFinalRelatedMarkers(html);
  if (!posts.length) return h;
  const add = posts
    .filter((p) => /^https?:\/\//i.test(String(p.url || ""))) // 주소가 없는 후보는 링크가 될 수 없다
    .filter((p, i, arr) => arr.findIndex((x) => x.url.split("?")[0] === p.url.split("?")[0]) === i) // 같은 글 두 번 금지
    .slice(0, 3);
  if (!add.length) return h;
  const markers = add.map((p) => `<p>[마무리관련글: ${p.url} | ${String(p.title).slice(0, 60)}]</p>`).join("");
  return `${h}\n${markers}`;
}

// ═══ 분량 하드컷(2026-08-04 유저 확정: "최대 2500자를 넘지 마세요") ═══
//  ★지금까지 분량 게이트는 전부 '경고 → 재생성' 구조였다. 재생성이 실패하거나 예산이 없으면
//   그냥 통과했고, 그래서 유저가 네 번 연속 긴 글을 받았다. 부탁이 아니라 실행이어야 한다.
//  ★자를 때 원칙: 뒤에서부터 섹션을 통째로 뺀다. 문장 중간을 자르면 글이 망가진다.
//   클로징(마지막 블록)과 해시태그는 반드시 남긴다 — 그게 없으면 글이 뚝 끊긴 것처럼 보인다.
// ★2,500 → 3,200(2026-08-05 유저 확정: 체류시간·광고 슬롯 확보). 상한이지 목표가 아니다.
// ═══ 경고 색상(2026-08-06 유저: "경고·긴박·긴급·중요·함정 이런 건 레드로") ═══
//  ★색은 모델이 매번 다른 값을 쓴다(#f00, red, crimson, #e74c3c…). 톤이 섞이면 조잡해 보이고,
//   40~70대 화면에서 '진짜 위험'과 '그냥 강조'가 구분이 안 된다. 그래서 한 값으로 눌러 통일한다.
//  ★남발도 막는다 — 빨강이 여러 곳이면 어느 것도 경고로 안 읽힌다(볼드 남발과 같은 병).
export const ALERT_RED = "#e5342b";
export const ALERT_MAX = 3;
// ★붉은가는 '앞자리'로 못 정한다 — #d9dde3(구분선 회색)도 d로 시작한다.
//  실제로 처음 이렇게 짰다가 회색 구분선이 빨개질 뻔했다. R이 G·B보다 뚜렷이 커야 빨강이다.
const NAMED_RED = /^(red|crimson|firebrick|tomato|orangered|indianred|darkred)$/i;
function isReddish(v: string): boolean {
  const t = v.trim().toLowerCase();
  if (NAMED_RED.test(t)) return true;
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(t);
  let r: number, g: number, b: number;
  if (rgb) { [r, g, b] = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]; }
  else {
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(t);
    if (!m) return false;
    const hex = m[1]!.length === 3 ? m[1]!.split("").map((c) => c + c).join("") : m[1]!;
    r = parseInt(hex.slice(0, 2), 16); g = parseInt(hex.slice(2, 4), 16); b = parseInt(hex.slice(4, 6), 16);
  }
  return r >= 130 && r - g >= 60 && r - b >= 60; // 회색·분홍빛 연회색은 걸러진다
}
/** 붉은 계열 글자색을 한 값으로 통일하고 상한을 넘는 것은 일반 볼드로 되돌린다. */
export function normalizeAlertColor(html: string, max = ALERT_MAX): { html: string; kept: number; demoted: number } {
  let kept = 0, demoted = 0;
  // ★배경색(형광펜)은 건드리지 않는다 — 'background-color'가 'color'로 잡히지 않게 앞을 확인한다
  const out = String(html || "").replace(/([\w-]*)(color\s*:\s*[^;"']+)/gi, (m, prefix: string, decl: string) => {
    if (/background|border|outline/i.test(prefix)) return m;
    const val = decl.replace(/^color\s*:\s*/i, "");
    if (!isReddish(val)) return m;
    if (kept < max) { kept += 1; return `${prefix}color:${ALERT_RED}`; }
    demoted += 1;
    return `${prefix}font-weight:700`; // 상한 초과분은 색을 빼고 굵기만 남긴다
  });
  return { html: out, kept, demoted };
}

// ═══ 문단 쪼개기(2026-08-06 유저 화면: 한 문단 13줄) ═══
//  ★게이트를 두는 것만으로는 안 잡혔다. specDefects는 '경고'라 재생성 예산이 없으면 그대로 발행된다 —
//   유저가 본 13줄 문단이 정확히 그 경로로 나갔다(게이트는 울렸는데 아무도 안 막았다).
//  ★publishHtml에도 splitLongParagraphs가 있다 — 이름은 비슷해도 맡는 자리가 다르다.
//   저쪽은 '네이버 복붙 렌더'에서 2문장씩 묶는 것이고(발행 직전 가공),
//   여기는 '저장본' 자체를 고친다. 워드프레스는 저장본(body_html)을 그대로 발행하므로
//   여기서 안 나누면 WP 글에는 긴 문단이 그대로 나간다. 그래서 둘 다 필요하다.
//  ★CLAUDE.md 원칙: 프롬프트는 방향, 코드는 한계선. 문단 길이는 코드가 보장할 수 있는 종류다.
//   여러 문장이 든 문단은 문장 경계에서 기계적으로 나누면 뜻이 안 상한다.
//   ★반대로 '한 문장이 긴 것'은 코드가 못 고친다(다시 써야 한다) — 그건 게이트로 모델에 돌려보낸다.
const SENT_SPLIT_RE = /(?<=[.!?。][\s"'\u201d\u2019)\]]*)(?=\S)/g;
export function splitMultiSentenceParagraphs(html: string, maxLines = PARA_MAX_LINES): { html: string; split: number } {
  let split = 0;
  const out = String(html || "").replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/g, (m, attr: string, inner: string) => {
    const plain = inner.replace(/<[^>]+>/g, "");
    if (Math.ceil([...plain].length / CHARS_PER_LINE) <= maxLines) return m;
    // ★태그가 문장을 가로지르면 쪼갤 때 태그가 깨진다 — 그런 문단은 건드리지 않는다.
    //  (열고 닫는 짝이 문장 안에서 완결된 경우만 안전하다)
    const parts = inner.split(SENT_SPLIT_RE).map((x) => x.trim()).filter(Boolean);
    if (parts.length < 2) return m; // 한 문장짜리 = 코드로는 못 고친다(게이트가 모델에 돌려보낸다)
    const balanced = (t: string) => {
      const o = (t.match(/<(?!\/)(?!br|img|hr)[a-zA-Z]/g) ?? []).length;
      const c = (t.match(/<\/[a-zA-Z]/g) ?? []).length;
      return o === c;
    };
    if (!parts.every(balanced)) return m;
    // 문장을 이어 붙이되 상한을 넘기 직전에 문단을 끊는다
    const buckets: string[] = [];
    let cur = "";
    for (const s of parts) {
      const next = cur ? `${cur} ${s}` : s;
      const lines = Math.ceil([...next.replace(/<[^>]+>/g, "")].length / CHARS_PER_LINE);
      if (cur && lines > maxLines) { buckets.push(cur); cur = s; } else { cur = next; }
    }
    if (cur) buckets.push(cur);
    if (buckets.length < 2) return m;
    split += buckets.length - 1;
    return buckets.map((b) => `<p${attr}>${b}</p>`).join("");
  });
  return { html: out, split };
}

export const HARD_CHAR_LIMIT = 3200;

/** 본문을 하드 상한 안으로 줄인다. 섹션(h2) 단위로 뒤에서부터 제거하고, 클로징·해시태그는 보존한다. */
export function hardTrimToLimit(html: string, count: (h: string) => number, limit = HARD_CHAR_LIMIT): { html: string; removed: string[] } {
  let cur = String(html || "");
  const removed: string[] = [];
  if (count(cur) <= limit) return { html: cur, removed };

  // 섹션 경계 파싱 — [시작, 끝, 제목]
  const sections = () => [...cur.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => ({
    start: m.index ?? 0,
    title: stripTags(m[1]).trim(),
  }));

  // ★뒤에서 두 번째 섹션부터 지운다 — 마지막 섹션 뒤에는 클로징이 붙어 있어 통째로 지우면 마무리가 사라진다.
  //  FAQ가 있으면 그것부터(본문이 이미 답한 것이라 손실이 가장 적다).
  for (let guard = 0; guard < 6 && count(cur) > limit; guard++) {
    const secs = sections();
    if (secs.length <= 2) break; // 소제목 2개 미만으로는 줄이지 않는다(글이 아니게 된다)
    const faqIdx = secs.findIndex((x) => /자주\s*묻는|FAQ/i.test(x.title));
    const idx = faqIdx >= 0 ? faqIdx : secs.length - 2;
    const from = secs[idx]!.start;
    const to = idx + 1 < secs.length ? secs[idx + 1]!.start : cur.length;
    removed.push(secs[idx]!.title || "(제목 없음)");
    cur = cur.slice(0, from) + cur.slice(to);
  }
  return { html: cur, removed };
}

// ═══ 뻔한 사진 차단(2026-08-04 유저 실측: "다 의미 없는 것들이라") ═══
//  실측 5장: 스마트폰 화면 보는 손 / 달력에 날짜 표시하는 손 / 노트북으로 홈택스 조회 /
//  스마트폰 앱 스크롤 / 식탁 위 스마트폰과 커피잔. 다섯 중 셋이 '화면 보는 손'이다.
//  ★프롬프트는 이미 "'~화면을 보는' 형식 금지"라고 못 박고 있었는데 그대로 통과했다 — 또 샜다.
//  ★그리고 이건 우리만의 문제가 아니라 이 소재군 자체가 죽었다: 경제 블로그 열에 아홉이
//   같은 스톡 사진을 쓴다. 유저가 제공한 상위 4편에는 '화면 보는 손'이 한 장도 없다.
const CLICHE_SCENE_RE = /(스마트폰|휴대폰|핸드폰|모바일|노트북|태블릿|모니터|화면)/;
const CLICHE_ACT_RE = /(보는|보고|들여다|내려다|확인하는|조회하는|스크롤|터치|입력하는|클릭)/;

/** 뻔한 '기기 화면 보는 장면' 슬롯 목록. 전체의 절반을 넘으면 그 글은 스톡 사진 세트가 된다. */
export function clichePhotoSlots(html: string): { total: number; cliche: number; samples: string[] } | null {
  const descs = [...String(html || "").matchAll(/\[사진:\s*([^\]]+)\]/g)].map((m) => m[1].trim());
  if (descs.length === 0) return null;
  const bad = descs.filter((d) => CLICHE_SCENE_RE.test(d) && CLICHE_ACT_RE.test(d));
  // ★한 장은 봐준다(신청·조회형 글은 화면이 소재일 수 있다). 문제는 '세트로 나오는 것'이다.
  if (bad.length <= 1 || bad.length * 2 <= descs.length) return null;
  return { total: descs.length, cliche: bad.length, samples: bad.slice(0, 3) };
}

// ═══ 스켈레톤 준수(2026-08-02 발행글 전문 감사) ═══
//  실측 「주식창, 처음 열면…」: FAQ 4개(규격 2), 3줄 요약 5줄(규격 3), 도입 인용구 훅 없음.
//  고정 스켈레톤은 "좋은 폼이 추첨되지 않게" 못 박은 것인데(2026-07-13), 개수가 조용히 늘어나 있었다.
//  ★다이어트 v3의 이유: FAQ 3개+ / 요약 줄이 늘면 덩어리로 보인다.
export interface SkeletonReport { faq: number; summaryLines: number; hasOpeningQuote: boolean; issues: string[] }

// ═══ 분량 예산 한계선(2026-08-03 유저 실측: 목표 1,800인데 2,603자) ═══
//  ★프롬프트로만 예산을 줬더니 섹션마다 1.3~1.7배로 넘겼다. CLAUDE.md의 '프롬프트는 방향, 코드는 한계선'을
//   분량에만 안 지키고 있었다. 총량 게이트(lenCap)는 '다 쓴 뒤'에야 알기 때문에 압축 재생성이라는 비싼 수를
//   써야 한다 — 섹션 단위로 어디가 부풀었는지 짚어 주면 한 번의 재생성으로 정확히 그 자리만 줄일 수 있다.
//  ★품질 심사가 아니라 최소선이다: '예산의 1.3배를 넘긴 섹션'만 지적한다(1.0배로 조이면 매번 걸린다).
export interface SectionBudgetReport { sections: { title: string; chars: number }[]; issues: string[] }

// ★섹션 글자수도 '읽는 분량'으로 센다(2026-08-03) — 슬롯 마커·해시태그·URL은 발행되면 글자가 아니다.
//  총량 게이트(countBodyChars)와 다른 자로 재면 '섹션 합은 예산 안인데 총량은 초과' 같은 모순이 생긴다.
const textLen = (s: string) => stripTags(s)
  .replace(/\[(사진|카드|차트)\s*:[^\]]*\]/g, " ")
  .replace(/\[[^\]]{0,40}(자리|삽입)[^\]]{0,20}\]/g, " ")
  .replace(/https?:\/\/\S+/g, " ")
  .replace(/#[^\s#]+/g, " ")
  .replace(/\s/g, "").length;

export function sectionBudgetReport(html: string, perSection: number): SectionBudgetReport {
  const h = String(html || "");
  const parts = [...h.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2|$)/gi)];
  const sections = parts.map((m) => ({ title: stripTags(m[1]).trim().slice(0, 24), chars: textLen(m[2]) }));
  const issues: string[] = [];
  // ★고정 블록(FAQ)은 섹션 예산이 아니라 자기 예산(≈100자)을 쓴다 — 같은 자로 재면 안 된다.
  const isFaq = (t: string) => /자주\s*묻는|FAQ/i.test(t);
  const over = sections.filter((s) => !isFaq(s.title) && s.chars > perSection * 1.3);
  for (const s of over) {
    issues.push(`'${s.title}' 섹션이 ${s.chars.toLocaleString()}자다(예산 ${perSection}자). 이 섹션에서 곁가지 문단을 버리거나 나열을 표로 바꿔 ${perSection}자 안으로 줄여라 — 소제목을 새로 쪼개지 마라(총량이 더 커진다).`);
  }
  const faq = sections.find((s) => isFaq(s.title));
  if (faq && faq.chars > 160) {
    issues.push(`'자주 묻는 질문'이 ${faq.chars}자다(예산 100자). 답은 질문당 딱 1문장으로 줄여라 — 배경 설명·조건 나열은 본문이 이미 했다.`);
  }
  return { sections, issues };
}

// ★해시태그 보장(2026-08-03 유저 실측: 분량을 조였더니 모델이 통째로 버렸다).
//  프롬프트에 '생략 금지'를 넣었지만 프롬프트는 방향이고 이건 한계선이다 —
//  해시태그는 네이버 편집기에서 태그 영역으로 빠져 본문 글자가 아니라, 버려도 분량이 안 줄고
//  노출 장치만 잃는다. 즉 없을 이유가 전혀 없으므로 없으면 코드가 채운다.
//  ★지어내지 않는다: 키워드에서 파생한 것만 쓴다(해시태그는 사실 주장이 아니라 분류 라벨이다).
/**
 * ★대표 태그를 맨 앞에 끼워 넣는다(2026-08-05 유저 지시).
 *  유저 방법: 발행 후 [태그 수정]에서 고단가 키워드를 태그 맨 앞에 하나 넣으면
 *  하단 파워링크가 그 계열 광고로 바뀐다 → 애드포스트 단가가 오른다.
 *  ★이미 있으면 순서만 앞으로 당긴다(중복으로 두 번 넣지 않는다).
 *  ★안전선: 여기 넣는 말은 반드시 본문에 등장하는 것이어야 한다 —
 *   무관한 고단가 태그는 광고주 타겟과 어긋나 신고·정지 위험이다(유저가 함께 준 주의사항).
 */
// ★글 '끝'의 해시태그 줄. 본문 중간에 모델이 쓴 태그가 있어도 우리가 다루는 건 마지막 줄이다.
const TAIL_TAG_LINE_RE = /<p[^>]*>(?:\s*#[가-힣A-Za-z0-9_]{2,})+\s*<\/p>\s*$/;

export function leadHashtag(html: string, lead: string): string {
  const w = String(lead || "").replace(/\s+/g, "");
  if (w.length < 2) return html;
  const h = String(html || "");
  // ★'첫' 태그 줄이 아니라 '마지막' 태그 줄을 고친다(2026-08-06).
  //  모델이 본문 중간에 태그를 쓰면 첫 매치가 그쪽이라, 엉뚱한 자리를 대표 태그로 바꿔놓고
  //  정작 글 끝의 태그 줄은 그대로 남았다.
  const all = [...h.matchAll(/(<p[^>]*>)((?:\s*#[가-힣A-Za-z0-9_]{2,})+\s*)(<\/p>)/g)];
  const m = all[all.length - 1];
  if (!m) return h; // 해시태그 줄이 없으면 손대지 않는다(ensureHashtags가 먼저 돈다)
  const tags = (m[2]!.match(/#[가-힣A-Za-z0-9_]{2,}/g) ?? []).map((t) => t.trim());
  void tags;
  // ★대표 태그가 있으면 그것 하나만 남긴다(2026-08-05 유저 확정: "이런 애들은 #분양만 들어가야 하는데").
  //  이유: 태그가 여럿이면 네이버가 어느 것을 광고 기준으로 삼을지 불확실하다.
  //  하나만 두면 하단 파워링크가 그 키워드 계열로 확실히 바뀐다 — 이 기능의 목적이 그것이다.
  //  ★대표 태그가 없는 글은 여기 오지 않는다(빈 값이면 위에서 그대로 돌려준다) —
  //   그런 글은 ensureHashtags가 만든 여러 태그를 그대로 유지한다(유저 확인).
  const next = [`#${w}`];
  return h.replace(m[0], `${m[1]}${next.join(" ")}${m[3]}`);
}

export function ensureHashtags(html: string, keyword: string, tag?: string, modelTags?: unknown): string {
  // ★2026-08-06 재작성. 종전 방식은 '태그가 몇 개인지 세어 보고 부족하면 뒤에 붙인다'였는데,
  //  마감이 여러 번 도는 구조(pregen 저장 → 유저가 열 때 claim에서 재적용)에서 결과가 매번 달라졌다.
  //  ★게다가 태그 줄 뒤에 관련글 마커가 붙기 때문에 '글 맨 끝'을 봐서는 기존 태그 줄을 못 찾는다 —
  //   실제로 그렇게 고쳤다가 관련글이 있는 글에서만 태그가 또 불어났다(관련글 없는 테스트만 통과).
  //  ★그래서 세지 않는다: 태그 줄을 전부 걷어내고, 하나를 다시 만들어 맨 끝에 놓는다.
  //   몇 번을 돌려도 결과가 같고, 태그는 항상 글의 마지막 줄이 된다(네이버 관례이기도 하다).
  const h0 = String(html || "");
  const found: string[] = [];
  // 해시태그만으로 이뤄진 문단 = 태그 줄. 산문 속에 섞인 #는 건드리지 않는다.
  const stripped = h0.replace(/<p[^>]*>\s*((?:#[가-힣A-Za-z0-9_]{2,}\s*)+)<\/p>/g, (_m, inner: string) => {
    found.push(...(inner.match(/#[가-힣A-Za-z0-9_]{2,}/g) ?? []).map((t) => t.slice(1)));
    return "";
  });
  // ★이미 있던 태그가 1순위다 — 대표 태그 하나만 남긴 글(의도된 1개)을 되살릴 수 있어야 한다.
  //  2순위는 모델이 만든 태그(2026-08-03 유저 화면: 모델은 tags 필드엔 잘 넣고 본문 하단엔 안 썼다).
  //  '리딩방 사기'·'불공정거래 신고'처럼 키워드에서는 절대 못 뽑는 말이 여기 있다.
  const fromModel = (Array.isArray(modelTags) ? modelTags : [])
    .map((t) => String(t ?? "").replace(/^#/, "").replace(/\s+/g, "").trim())
    .filter((t) => [...t].length >= 2);
  const kw = String(keyword || "").trim();
  // 3순위 폴백 — 위가 다 비었을 때만 키워드에서 파생한다(지어내지 않는다).
  const fromKeyword = kw
    ? [kw.replace(/\s+/g, ""), ...kw.split(/\s+/).map((t) => t.replace(/[^가-힣a-zA-Z0-9]/g, "")), (tag ?? "").replace(/\s+/g, "")]
    : [];
  // ★이미 태그 줄이 있었으면 그것만 쓴다 — 열 때마다 태그가 늘어나는 걸 막는 핵심이다.
  const cand = found.length ? found
    : (fromModel.length >= 3 ? fromModel : [...fromModel, ...fromKeyword]);
  const uniq = [...new Set(cand.map((t) => t.trim()).filter(Boolean))].filter((t) => [...t].length >= 2).slice(0, 6);
  if (uniq.length === 0) return h0;
  return `${stripped.replace(/\s+$/, "")}\n<p>${uniq.map((t) => `#${t}`).join(" ")}</p>`;
}

// ═══ 클로징 댓글 유도 질문(2026-08-07 유저 확정 — 지수 레버) ═══
//  ★프롬프트에만 두면 이모지·형광펜과 같은 병으로 죽는다(규칙은 있는데 아무도 안 재서 0개로 나감).
//  판정: 글 끝부분(해시태그·관련글 마커 제외 마지막 500자)에 물음표 문장이 있는가.
//  FAQ의 'Q.'와 혼동 방지: FAQ는 글 끝이 아니라 클로징 앞이고, 끝 500자만 보므로 대부분 겹치지 않는다.
export function closingQuestionMissing(html: string): boolean {
  const tail = String(html || "")
    .replace(/<p[^>]*>\s*(?:#[가-힣A-Za-z0-9_]{2,}\s*)+<\/p>/g, " ")      // 해시태그 줄 제외
    .replace(/\[(?:마무리)?관련글:[^\]]*\]/g, " ")                        // 관련글 마커 제외
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(-500);
  if (!tail) return true;
  // 'Q.'로 시작하는 FAQ 질문은 유도 질문이 아니다 — 그것만 있는 경우를 걸러야 해서 Q. 문장은 지우고 본다
  const woFaq = tail.replace(/Q[.．][^?？]*[?？]/g, " ");
  return !/[?？]/.test(woFaq);
}

// ═══ 폐기 블록 부활 감시(2026-08-03 실측) ═══
//  ★'오늘의 3줄 요약'을 폐기했더니 소제목 없이 글 끝 불릿으로 되살아났다.
//   skeletonReport는 <h2>...요약...</h2>를 찾으므로 소제목이 없으면 못 잡는다 — 우회당한 것이다.
//   ★그래서 '이름'이 아니라 '모양'으로 잡는다: 글 뒷부분에 있는, 본문을 되짚는 긴 불릿 묶음.
//   허용되는 뒷부분 목록과 구분해야 한다 — 체크박스(□) 리스트와 '이런 분께 도움 돼요'는 규격이 허용한 것이다.
export function tailSummaryBullets(html: string): number {
  const h = String(html || "");
  const uls = [...h.matchAll(/<ul(?:\s[^>]*)?>[\s\S]*?<\/ul>/gi)];
  for (const m of uls) {
    if (m.index === undefined || m.index < h.length * 0.7) continue; // 글 뒷부분만
    const lis = m[0].match(/<li[\s\S]*?<\/li>/gi) ?? [];
    if (lis.length < 4) continue; // 3개 이하는 '이런 분께' 류 짧은 목록
    const texts = lis.map((li) => stripTags(li).trim());
    if (texts.some((t) => /[□☐]/.test(t))) continue; // 체크리스트는 허용(저장률 장치)
    if (/도움\s*(이\s*)?돼|해당(되|하)/.test(texts.join(" "))) continue; // '이런 분께 도움 돼요' 류
    // 본문 요약 불릿의 지문: 항목이 길고(설명이 붙고) 쉼표로 '항목, 설명' 구조를 이룬다
    const avg = texts.reduce((a, t) => a + t.replace(/\s/g, "").length, 0) / texts.length;
    if (avg >= 20) return lis.length;
  }
  return 0;
}

export function skeletonReport(html: string): SkeletonReport {
  const h = String(html || "");
  const text = stripTags(h);
  // FAQ — 'Q. '로 시작하는 문단 수(규격: 'Q. '로 시작하게 되어 있다)
  const faq = (text.match(/(?:^|\s)Q\.\s/g) ?? []).length
    || [...h.matchAll(/<p[^>]*>\s*(?:<[^>]+>)*\s*Q[.\s]/gi)].length;
  // 3줄 요약 — '요약' 소제목 뒤 첫 <ul>의 <li> 수
  let summaryLines = 0;
  const sm = /<h2[^>]*>[^<]*요약[^<]*<\/h2>([\s\S]*?)(?=<h2|$)/i.exec(h);
  if (sm) summaryLines = (sm[1].match(/<li/gi) ?? []).length;
  // 도입 인용구 훅 — 본문 첫 블록이 blockquote인가
  const firstBlock = /<(p|blockquote|h2|ul|ol|table)/i.exec(h);
  const hasOpeningQuote = firstBlock?.[1]?.toLowerCase() === "blockquote";

  const issues: string[] = [];
  if (faq > 2) issues.push(`자주 묻는 질문이 ${faq}개다(규격 2개). 본문이 못 다룬 것만 2개로 줄여라 — 3개 이상이면 덩어리로 보인다.`);
  // ★'오늘의 3줄 요약' 블록 폐기(2026-08-03 유저 확정) — 줄 수를 따지던 검사를 '존재하면 위반'으로 뒤집는다.
  //  이유: 글 맨 앞 '바쁘면 이것만'이 이미 결론을 준다. 끝에서 또 요약하면 같은 일을 앞뒤로 두 번 하는 것이고,
  //  그 중복이 분량 예산을 밀어내고 있었다(목표 1,800에 실측 7,000~8,000자).
  //  ★계측(summaryLines)은 남긴다 — 폐기가 실제로 화면에 닿았는지 세려면 숫자가 있어야 한다.
  if (summaryLines > 0) issues.push(`'오늘의 3줄 요약' 블록은 폐기됐다(${summaryLines}줄 발견). 이 소제목과 목록을 통째로 삭제하라 — 글 앞의 '바쁘면 이것만'이 이미 결론을 줬으므로 끝에서 다시 요약하지 않는다.`);
  if (!hasOpeningQuote) issues.push(`도입 인용구 훅이 없다. 본문 첫 줄은 <blockquote> 한 문장(40자 이내)으로 아픔만 찌른다 — 해결책은 담지 않는다.`);
  return { faq, summaryLines, hasOpeningQuote, issues };
}

// ═══ 어미 단조로움(2026-08-02 유저: "요요요 면서요 거든요 말투가 왜이럼, 더 AI같음") ═══
//  프롬프트로 "어미를 섞어라"라고 해도 모델은 금방 한 종결로 수렴한다. 코드가 실제로 센다.
//  ★품질 심사가 아니라 최소선이다 — '한 종결이 전체의 몇 %인가'와 '금지 어미가 몇 개인가' 둘만 본다.
export const ENDING_TOP_MAX = 0.55;  // 같은 3음절 종결이 전체의 55%를 넘으면 단조롭다
//  ★유저 불만의 정체는 "요요요" — 세부 어미가 달라도 전부 '요'로 끝나면 같은 소리로 읽힌다.
//   그래서 '요 종결 비율'을 따로 잰다(이게 주 지표이고 3음절 분포는 보조다).
export const ENDING_YO_MAX = 0.75;
export const ENDING_MIN_SENTENCES = 8; // 이보다 짧은 글은 판정하지 않는다(표본 부족)

// ★2026-08-02 재정의: 처음엔 '~인데요·~면서요'를 AI 신호로 보고 막았는데, 유저 레퍼런스(실제 블로그 10편)가
//  그걸 자연스럽게 쓴다("…에코프로비엠 주가인데요.", "공매도 치고 싶게 생겼는데요."). 금지를 철회한다.
//  ★진짜 AI 티는 어미가 아니라 '감정 반응이 없는 것'이다 — 사실만 고르게 나열하면 기계 글이다.
//   레퍼런스의 사람 냄새는 전부 반응에서 나온다: "젠장", "후우", "이건 좀 아쉽습니다", "ㅎㅎ".
const REACTION_RE = /(네요|군요|죠[.!?]|싶(?:네|습니|어|기도)|아쉽|놀랍|다행|답답|씁쓸|허탈|막막|후우|허참|젠장|ㅎㅎ|ㅋㅋ|좀\s*그렇|생각보다|솔직히|의외로)/g;
export const REACTION_MIN = 4; // 이보다 적으면 감정 없는 정보 나열로 본다

/** 문장 끝 2~3음절을 종결로 본다. '~니다/~해요/~예요/~죠' 등이 여기서 갈린다. */
function endingKeys(html: string): string[] {
  const text = stripTags(html).replace(/\s+/g, " ");
  const sents = text.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter((x) => [...x].length >= 6);
  const keys: string[] = [];
  for (const sn of sents) {
    const core = sn.replace(/[.!?"'”’)\]]+$/g, "");
    const tail = [...core].slice(-3).join("");
    if (tail) keys.push(tail);
  }
  return keys;
}

export interface EndingReport { sentences: number; topKey: string | null; topRatio: number; yoRatio: number; reactions: number; flat: boolean; monotone: boolean }

export function endingReport(html: string): EndingReport {
  const keys = endingKeys(html);
  const reactions = (stripTags(html).match(REACTION_RE) ?? []).length;
  if (keys.length < ENDING_MIN_SENTENCES) return { sentences: keys.length, topKey: null, topRatio: 0, yoRatio: 0, reactions, flat: false, monotone: false };
  const count = new Map<string, number>();
  for (const k of keys) count.set(k, (count.get(k) ?? 0) + 1);
  let topKey: string | null = null, top = 0;
  for (const [k, n] of count) if (n > top) { top = n; topKey = k; }
  const topRatio = top / keys.length;
  const yoRatio = keys.filter((k) => k.endsWith("요")).length / keys.length;
  const flat = reactions < REACTION_MIN; // ★감정 반응 부재 — 이게 진짜 AI 티다
  return { sentences: keys.length, topKey, topRatio, yoRatio, reactions, flat, monotone: yoRatio > ENDING_YO_MAX || topRatio > ENDING_TOP_MAX };
}

/** 어미가 단조로운가 — 한 종결이 과반을 넘으면 true. */
export function hasMonotoneEndings(html: string): boolean {
  return endingReport(html).monotone;
}

/** 감정 반응이 없는 정보 나열인가 — 어미를 섞어도 이게 없으면 기계 글로 읽힌다. */
export function isFlatTone(html: string): boolean {
  return endingReport(html).flat;
}

// ═══ 소제목-본문 정합(2026-08-02 유저: "네이버 AI가 소제목과 본문이 일치하는지까지 본다") ═══
//  소제목이 던진 말을 그 아래 본문이 받지 않으면, 사람에게도 검색엔진에게도 '딴 얘기'가 된다.
//  ★품질 심사가 아니라 최소선만 본다 — 소제목의 핵심어가 그 섹션 본문에 하나도 없으면 실격.
const HEADING_STOP = new Set([
  "무엇", "어떻게", "언제", "어디서", "누가", "얼마", "얼마나", "왜", "이것", "그것", "정리", "총정리",
  "확인", "주의", "자주", "묻는", "질문", "요약", "핵심", "방법", "경우", "대해", "관해", "알아야",
  "하나요", "인가요", "일까요", "있나요", "되나요", "합니다", "해야", "위한", "위해", "그리고", "하지만",
]);

/** 스켈레톤 고정 소제목 — 내용 소제목이 아니므로 정합 판정에서 제외한다. */
const SKELETON_HEADING = /(자주\s*묻는\s*질문|오늘의\s*3줄\s*요약|많이\s*하는\s*실수|3줄\s*요약)/;

function headingCoreTokens(h: string): string[] {
  return String(h || "")
    .replace(/[^가-힣a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/(은|는|이|가|을|를|의|에|도|와|과|로|으로|에서|부터|까지)$/, ""))
    .filter((w) => [...w].length >= 2 && !HEADING_STOP.has(w));
}

/**
 * 소제목과 그 아래 본문이 어긋난 h2 목록을 돌려준다(빈 배열이면 통과).
 * 핵심어가 하나도 없는 소제목만 잡는다 — 부분 일치·동의어까지 요구하면 오탐이 난다.
 */
export function headingMismatches(html: string): string[] {
  const src = String(html || "");
  const parts = src.split(/<h2[^>]*>/i).slice(1); // 첫 h2 이전(도입부)은 판정 대상 아님
  const out: string[] = [];
  for (const part of parts) {
    const close = part.search(/<\/h2>/i);
    if (close === -1) continue;
    const heading = stripTags(part.slice(0, close)).trim();
    if (!heading || SKELETON_HEADING.test(heading)) continue;
    const bodyText = stripTags(part.slice(close)).replace(/\s+/g, "");
    if (!bodyText) { out.push(heading); continue; }
    const toks = headingCoreTokens(heading);
    if (toks.length === 0) continue; // 판정할 핵심어가 없는 소제목(예: '이런 분이라면')은 통과
    if (!toks.some((t) => bodyText.includes(t))) out.push(heading);
  }
  return out;
}

/** 소제목-본문 정합 실패가 있는가. */
export function hasHeadingMismatch(html: string): boolean {
  return headingMismatches(html).length > 0;
}

// ★사진 슬롯 소재 중복 게이트(2026-07-29 유저 실측: 1번 '소상공인 가게 카운터 통장' / 3번 '노트북 앞에 앉은 소상공인 사업주'
//  — '소상공인'이 겹쳐 두 장이 같은 결의 그림이 된다). 슬롯 설명은 유저가 이미지 도구에 그대로 붙여넣는 주문서라,
//  소재가 겹치면 비슷한 그림이 두 장 나와 섹션별 핏이 무너진다. 프롬프트는 방향, 이 게이트는 한계선.
const SLOT_STOP = new Set([
  "사진", "이미지", "모습", "장면", "예시", "관련", "그리고", "위에", "앞에", "옆에", "함께", "하는", "있는", "앉은", "든",
  "화면", "자료", "내용", "준비", "확인", "사용", "선택", "비교", "정리",
]);
function slotNouns(desc: string): Set<string> {
  return new Set(
    String(desc || "")
      .replace(/^AI\s*컨셉\s*[—-]\s*/, "")
      .replace(/[^가-힣a-zA-Z0-9\s]/g, " ")
      .split(/\s+/)
      .map((w) => w.replace(/(과|와|의|을|를|이|가|에|은|는)$/, "")) // 조사 제거 — '통장을'과 '통장'을 같은 소재로 본다
      .filter((w) => [...w].length >= 2 && !SLOT_STOP.has(w)),
  );
}

/** 사진 슬롯끼리 명사가 겹치는가 — 겹치면 같은 결의 그림이 두 장 나온다. 슬롯이 2개 미만이면 판정 대상 아님. */
export function duplicateSlotSubjects(html: string): boolean {
  const descs = [...String(html || "").matchAll(/\[사진:\s*([^\]]+)\]/g)].map((m) => m[1]!.trim());
  if (descs.length < 2) return false;
  const sets = descs.map(slotNouns);
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      for (const w of sets[i]!) if (sets[j]!.has(w)) return true;
    }
  }
  return false;
}


// ★제목 뼈대 수렴 게이트(2026-08-01 유저 실측: WP 31편 중 7편이 '~ 전 확인할 N가지'였다).
//  프롬프트 로테이션은 돌고 있었지만, 한 형식 안에서 예시 뼈대를 그대로 베껴 제목이 획일화됐다.
//  구글은 같은 틀의 대량 제목을 '대량 생산 사이트' 신호로 읽는다 — 애드센스가 걸린 채널이라 특히 위험하다.
//  프롬프트는 방향, 코드가 한계선(CLAUDE.md).
const TITLE_OVERUSED_RE = [
  /전\s*(?:확인할|알아야\s*할|봐야\s*할|체크할)\s*\d+\s*가지/,   // ~ 전 확인할 5가지
  /시작\s*전\s*\d+\s*가지/,
  /법\s*[:：]/,                                                  // ~는 법: 부제 (2026-07-16에 잡았던 옛 수렴 — '고르는 법:'도 같은 틀)
  /총정리\s*[:：]/,
];

/** 제목이 과다 사용된 뼈대인가 — 걸리면 재생성 대상. */
export function isOverusedTitleShape(title: string): boolean {
  const t = (title ?? "").trim();
  return TITLE_OVERUSED_RE.some((re) => re.test(t));
}

/**
 * 최근 제목들과 뼈대가 겹치는가 — 한국어 제목은 앞(주제어)이 아니라 **뒤(어미 쪽)가 수렴**한다.
 * '중국주식 시작 / 저축은행 종류 선택 / 온투업 투자'는 다 다르지만 끝은 전부 '전 확인할 N가지'다.
 * 그래서 마지막 3어절만 뼈대로 본다(숫자는 #으로 뭉갠다).
 */
export function titleShapeClashes(title: string, recentTitles: string[], threshold = 2): boolean {
  const shape = (t: string) => {
    const toks = (t ?? "").replace(/[0-9]+/g, "#").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    return toks.slice(-3).join(" ");
  };
  const s = shape(title);
  if (s.length < 4) return false;
  return recentTitles.filter((r) => shape(r) === s).length >= threshold;
}

// ═══ 혈통 검증(2026-08-05) — 근거와 내용이 어긋난 카드를 버린다 ═══
//  실물 둘: ①씨앗 '2026년 65세 이상 꼭 받아야 할…' → 카드 '2026 정부지원금 놓치는 청년의 현실'
//          ②씨앗 '2026년 신규 1인 소상공인 육아지원금' → 카드 '충북출산육아지원금 기한'
//  ★왜 위험한가: 카드에는 씨앗의 뉴스 근거(newsContext·sourceTitle)가 함께 붙는다.
//   근거가 다른 얘기를 하는데 그 근거로 본문까지 쓰면, 글 전체가 틀린 출처 위에 서게 된다.
//  ★종전 방어(토큰 교집합)가 못 잡은 이유: '2026·지원금·육아지원금' 같은 범용어만 겹쳐도 통과했다.
//   그래서 겹침을 세기 전에 범용어를 빼고, 그다음 '서로 배타적인 것'을 따로 본다.
const LINEAGE_STOP = new Set(["2024", "2025", "2026", "2027", "지원금", "정부지원금", "보조금", "혜택", "신청", "기준", "조건", "방법", "제도", "정책", "총정리", "정리", "대상", "기한", "안내", "확대", "신규", "변경", "개편", "현실", "이유"]);
// 서로 배타적인 대상 축 — 한쪽이 씨앗에, 반대쪽이 카드에 있으면 같은 얘기일 수 없다.
const EXCLUSIVE_AXES: [RegExp, RegExp][] = [
  [/(청년|20대|30대|사회초년생|신입)/, /(노인|어르신|고령|65세|70세|시니어|정년|은퇴)/],
  [/(무주택|세입자|임차인|전세|월세)/, /(다주택|집주인|임대인|보유세)/],
  [/(소상공인|자영업|사업자|창업)/, /(직장인|근로자|월급쟁이|재직)/],
  [/(출산|임신|육아|영유아|어린이집)/, /(취업|이직|퇴직|실업급여)/],
];
/** 카드가 씨앗과 같은 얘기인가. 어긋나면 사유, 맞으면 null. */
export function lineageConflict(seedText: string, cardText: string): string | null {
  const s = stripTags(seedText), c = stripTags(cardText);
  for (const [a, b] of EXCLUSIVE_AXES) {
    if (a.test(s) && b.test(c) && !a.test(c)) return `근거는 '${(s.match(a) ?? [])[0]}' 얘긴데 카드는 '${(c.match(b) ?? [])[0]}'`;
    if (b.test(s) && a.test(c) && !b.test(c)) return `근거는 '${(s.match(b) ?? [])[0]}' 얘긴데 카드는 '${(c.match(a) ?? [])[0]}'`;
  }
  // ★지역 창작 — 씨앗에 없는 지역명이 카드에만 있으면 그 지역 정보는 지어낸 것이다(가장 위험한 종류).
  const REGION = /(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/g;
  const inCard = [...new Set(c.match(REGION) ?? [])];
  const inSeed = new Set(c ? (s.match(REGION) ?? []) : []);
  const invented = inCard.filter((r) => !inSeed.has(r));
  if (invented.length) return `근거에 없는 지역 '${invented[0]}'이 카드에 생겼다`;
  return null;
}
/** 범용어를 뺀 실질 토큰 교집합 — 혈통 판정의 재료. */
function lineageShared(seedText: string, cardText: string): string[] {
  const tok = (t: string) => new Set(stripTags(t).replace(/[^가-힣a-zA-Z0-9 ]/g, " ").split(/\s+/)
    .map((w) => w.trim()).filter((w) => w.length >= 2 && !LINEAGE_STOP.has(w)));
  const st = tok(seedText);
  const out: string[] = [];
  for (const w of tok(cardText)) if (st.has(w) || [...st].some((x) => x.includes(w) || w.includes(x))) out.push(w);
  return out;
}
export function lineageOverlap(seedText: string, cardText: string): number {
  return lineageShared(seedText, cardText).length;
}
/**
 * 이 카드를 이 씨앗의 자식으로 볼 수 있는가.
 * ★기준 둘 중 하나: 실질 토큰 2개 겹침, 또는 4자 이상 주제 명사 1개 겹침('전세보증금'·'연금저축'급).
 *  2개만 요구하면 '전세보증금 반환보증'↔'전세보증금 반환대출'처럼 명백히 같은 주제가 잘려 나간다 —
 *  혈통을 지키려다 결품을 만들면 그것도 사고다. 대신 범용어는 애초에 세지 않으므로 헐거워지지 않는다.
 */
export function lineageAttached(seedText: string, cardText: string): boolean {
  const shared = lineageShared(seedText, cardText);
  return shared.length >= 2 || shared.some((w) => [...w].length >= 4);
}
