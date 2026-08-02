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
const CHARS_PER_LINE = 23; // 390px 프레임(본문폭 ~350px, 15px 한글) — check-article과 같은 기준
export const PARA_MAX_LINES = 4;

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
export const EMOJI_MIN = 2;
export function emojiCount(html: string): number {
  return (stripTags(html).match(EMOJI_RE) ?? []).length;
}

// ═══ 사진 슬롯 수(2026-08-02 실측: 마커 3개 = 하한에 딱 붙음) ═══
//  규격은 "하한 3, 상한 min(섹션 수, 7)"인데 섹션이 5개여도 3개만 나온다.
//  네이버는 사진이 체류·노출에 크게 작용하는데 최소로만 나가고 있었다.
export function photoSlotShortfall(html: string): { slots: number; sections: number; want: number } | null {
  const slots = (String(html || "").match(/\[사진:/g) ?? []).length;
  const sections = (String(html || "").match(/<h2/gi) ?? []).length;
  const want = Math.min(Math.max(3, sections), 6); // 섹션만큼(3~6)
  return slots < want ? { slots, sections, want } : null;
}

// ═══ 스켈레톤 준수(2026-08-02 발행글 전문 감사) ═══
//  실측 「주식창, 처음 열면…」: FAQ 4개(규격 2), 3줄 요약 5줄(규격 3), 도입 인용구 훅 없음.
//  고정 스켈레톤은 "좋은 폼이 추첨되지 않게" 못 박은 것인데(2026-07-13), 개수가 조용히 늘어나 있었다.
//  ★다이어트 v3의 이유: FAQ 3개+ / 요약 줄이 늘면 덩어리로 보인다.
export interface SkeletonReport { faq: number; summaryLines: number; hasOpeningQuote: boolean; issues: string[] }

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
  if (summaryLines > 3) issues.push(`'오늘의 3줄 요약'이 ${summaryLines}줄이다. 정확히 3줄로 줄여라 — 각 줄은 볼드 없이 20자 이내 완결 문장.`);
  if (summaryLines > 0 && summaryLines < 3) issues.push(`3줄 요약이 ${summaryLines}줄뿐이다. 정확히 3줄로 채워라.`);
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
