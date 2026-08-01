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
