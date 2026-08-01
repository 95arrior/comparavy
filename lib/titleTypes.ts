// ★홈판 제목 유형 7종 + 적합도 선택(2026-08-02 유저 확정 — "그 글에 핏한 걸 선택해서 작성").
//
//  왜 새로 만드는가: 기존 훅 배정(hookPatterns.pickHookPattern, homefeedBet의 dayIdx 회전)은 전부
//  '날짜·유저 해시 추첨'이었다. 추첨은 반복을 막을 뿐 글감에 맞는 유형을 고르지 못한다 —
//  마감이 있는 글감에 '비교형'이, 비교축이 없는 글감에 '비교형'이 걸리면 제목이 본문을 배신한다.
//  그래서 글감 텍스트에서 신호를 읽어 적합도를 매기고, 최고점을 고른다. 추첨은 동점일 때만 쓴다.
//
//  ★유형은 '문체'가 아니라 '약속'이다. 제목이 무엇을 약속하느냐가 유형을 결정하고,
//  본문은 그 약속을 이행해야 한다(미이행 = 낚시 = 체류 붕괴 = 다음 노출 사망).

export type TitleTypeKey = "gain" | "threat" | "curious" | "compare" | "twist" | "action" | "experience";

export interface TitleType {
  key: TitleTypeKey;
  name: string;
  /** LLM에게 주는 작성 지침 — 이 유형의 '약속'이 무엇인지. */
  guide: string;
  /** 본문이 반드시 이행해야 할 것 — 제목이 약속했으면 본문에 있어야 한다. */
  payoff: string;
  example: string;
}

export const TITLE_TYPES: TitleType[] = [
  {
    key: "gain",
    name: "이득형",
    guide: "독자가 '받을 수 있는 것'을 앞세운다. 금액·대상이 구체적일수록 강하다. 단 '누구나 받는다'로 단정하지 말고 조건이 있다는 사실은 남긴다.",
    payoff: "본문에 실제 금액·대상 조건·받는 경로가 있어야 한다.",
    example: "안 찾아간 돈 평균 12만 원, 조회는 3분이면 끝납니다",
  },
  {
    key: "threat",
    name: "위협형",
    guide: "그대로 두면 '확정되는 손해'를 지적한다. ★공포 조장이 아니라 담담한 사실 통보다 — 겁주는 문장이 아니라 놓치면 실제로 사라지는 것을 말한다. 실제 제도 일정·기한이 있을 때만 쓴다.",
    payoff: "본문에 실제 기한·손해의 크기·막는 방법이 있어야 한다.",
    example: "이번 달 넘기면 자동 해지됩니다, 놓치기 쉬운 신청 하나",
  },
  {
    key: "curious",
    name: "궁금형",
    guide: "답의 '존재'만 알리고 답은 숨긴다. 구체 숫자로 신뢰를 주되 그 숫자가 무엇을 뜻하는지는 본문에서. 통계·평균·순위처럼 독자가 자기 위치를 확인하고 싶어지는 소재에 특히 강하다.",
    payoff: "본문 앞부분에서 숨긴 답을 반드시 공개해야 한다(끝까지 미루면 이탈).",
    example: "30대 평균 저축액, 생각보다 낮은 이유가 있습니다",
  },
  {
    key: "compare",
    name: "비교형",
    guide: "두 선택지를 나란히 세우고 승자는 본문에서 밝힌다. 양쪽 나열로 끝내지 말고 '어떤 조건이면 어느 쪽'이라는 기준까지 간다.",
    payoff: "본문에 비교표 또는 조건별 갈림 기준이 있어야 한다.",
    example: "연금저축과 IRP, 먼저 채워야 하는 쪽은 따로 있습니다",
  },
  {
    key: "twist",
    name: "반전형",
    guide: "다들 믿는 상식이 사실과 다른 지점을 연다. ★단정 경구체는 피한다 — 'A는 B가 아니라 C다' 같은 칼럼 제목 대신 '~인 경우', '~할 수 있는 이유'처럼 조건·가능성으로 연다. 본문이 근거로 뒷받침할 수 있는 반전만.",
    payoff: "본문에 통념과 사실을 대조하는 근거(수치·제도 조항)가 있어야 한다.",
    example: "금리 높은 통장이 오히려 손해가 되는 경우",
  },
  {
    key: "action",
    name: "실행형",
    guide: "오늘 할 수 있는 행동 하나를 숫자로 못 박는다. '알아보기·정리'가 아니라 '무엇을 어디서 몇 분이면'까지. 신청·조회·발급처럼 절차가 있는 글감에 맞다.",
    payoff: "본문에 순서(번호 또는 체크박스)와 소요 시간·경로가 있어야 한다.",
    example: "5분이면 끝나는 환급 조회, 순서는 이 셋이면 됩니다",
  },
  {
    key: "experience",
    name: "경험형",
    guide: "★운영자가 실제로 겪은 일이 입력됐을 때만 쓴다. 그 경험을 제목의 문을 여는 자리에 놓고, 본문이 그 경험에서 얻은 판단으로 이어지게 한다. 경험이 없으면 이 유형은 후보에서 제외된다(지어내면 계정이 죽는다).",
    payoff: "본문에 그 실경험이 재료로 들어가야 한다(입력된 범위 안에서만).",
    example: "작년에 30만 원 토해내고 알았습니다, 연말정산에서 놓쳤던 것",
  },
];

export const TITLE_TYPE_BY_KEY: Record<TitleTypeKey, TitleType> =
  Object.fromEntries(TITLE_TYPES.map((t) => [t.key, t])) as Record<TitleTypeKey, TitleType>;

/** 글감에서 읽어낸 신호 — 적합도의 입력. 텍스트에서 자동 추출하거나 호출측이 직접 준다. */
export interface TopicSignals {
  /** 실제 기한·마감·시행일이 있는가 */
  deadline: boolean;
  /** ★받을 수 있는 돈 신호의 '밀도'(불리언이 아니라 개수) — 동점 때 순서로 갈리지 않게 한다 */
  benefitHits: number;
  /** 비교 축이 둘 이상인가 */
  compare: boolean;
  /** 통념·오해를 뒤집는 소재인가 */
  myth: boolean;
  /** ★절차 신호의 밀도(신청·조회·방법·순서…) */
  procedureHits: number;
  /** 통계·평균·순위 등 자기 위치 확인 소재인가 */
  statistic: boolean;
  /** 구체 숫자·금액이 자료에 있는가 */
  hasNumber: boolean;
  /** 운영자 실경험이 입력됐는가 — experience 유형의 전제조건 */
  userExperience: boolean;
}

// ★밀도를 세는 축(benefit·procedure)은 g 플래그로 둔다 — 불리언만 보면
//  '할인 신청 방법 순서 준비물'(절차 6신호)과 '할인'(이득 1신호)이 같은 점수가 되어
//  유형이 배열 순서로 갈린다(실측: 절차형 글감에 이득형이 걸렸다).
const RE = {
  deadline: /(마감|기한|까지|D-\d|\d{1,2}월\s?\d{1,2}일|종료|시행|접수\s*기간|신청\s*기간|자동\s*해지|연장)/,
  benefit: /(지원금|보조금|환급|미환급|바우처|공제|혜택|포인트|장려금|수당|보험금|캐시백|할인)/g,
  compare: /(비교|vs|VS|대비|차이|어느\s*쪽|둘\s*중|보다\s*유리|와\s*\S+\s*중)/,
  myth: /(오해|착각|사실은|알고\s*보면|의외|통념|잘못\s*알|다들\s*믿|함정|아닙니다|반전)/,
  procedure: /(신청|조회|발급|접수|가입|해지|이전|등록|제출|절차|방법|순서|준비물)/g,
  statistic: /(평균|중위|비율|순위|통계|얼마나|몇\s*%|퍼센트|상위\s*\d|하위\s*\d|격차)/,
  hasNumber: /\d[\d,]*\s*(원|만\s?원|억|%|퍼센트|년|개월|일|위|배)/,
};

const hits = (t: string, re: RegExp): number => t.match(re)?.length ?? 0;

/** 글감 텍스트(키워드+각도+뉴스 발췌 등)에서 신호를 읽는다. */
export function readSignals(text: string, opts: { userExperience?: boolean } = {}): TopicSignals {
  const t = String(text || "");
  return {
    deadline: RE.deadline.test(t),
    benefitHits: hits(t, RE.benefit),
    compare: RE.compare.test(t),
    myth: RE.myth.test(t),
    procedureHits: hits(t, RE.procedure),
    statistic: RE.statistic.test(t),
    hasNumber: RE.hasNumber.test(t),
    userExperience: Boolean(opts.userExperience),
  };
}

/**
 * 유형별 적합도 점수. 높을수록 이 글감에 맞는 제목 유형이다.
 * ★경험형은 실경험이 없으면 후보에서 완전히 빠진다(-1) — 지어낸 경험은 이 시스템의 금지선이다.
 * ★위협형도 실제 기한이 없으면 빠진다(-1) — 기한 없는 위협은 정보가 아니라 공포 조장이다.
 */
export function fitScore(key: TitleTypeKey, s: TopicSignals): number {
  switch (key) {
    case "gain":
      // 이득 신호가 여러 개 겹칠수록(환급+지원금+혜택) 이 글의 본질이 '받는 돈'이다.
      return s.benefitHits > 0 ? 3 + Math.min(s.benefitHits - 1, 1) + (s.hasNumber ? 1 : 0) : 0;
    case "threat":
      return s.deadline ? 4 + (s.benefitHits > 0 ? 1 : 0) : -1;
    case "curious":
      // 어느 글감에나 성립하는 기본형 — 1점을 깔아 두고 통계 소재면 강해진다.
      return 1 + (s.statistic ? 2 : 0) + (s.hasNumber ? 1 : 0);
    case "compare":
      return s.compare ? 3 + (s.hasNumber ? 1 : 0) : -1;
    case "twist":
      return s.myth ? 4 : 0;
    case "action":
      // 절차 신호가 촘촘한 글은 '오늘 뭘 하면 되는지'가 본질이다.
      return s.procedureHits > 0 ? 3 + Math.min(s.procedureHits - 1, 2) : 0;
    case "experience":
      return s.userExperience ? 6 : -1;
  }
}

/**
 * 이 글감에 가장 맞는 제목 유형을 고른다.
 * 동점이면 최근에 안 쓴 유형을 택한다(연속 반복 방지 — 추첨은 여기서만 쓴다).
 * 후보가 전부 음수면 궁금형으로 떨어진다(항상 성립하는 기본형).
 */
export function pickTitleType(signals: TopicSignals, recentKeys: string[] = []): TitleType {
  const recent = new Set(recentKeys.slice(0, 3));
  const scored = TITLE_TYPES.map((t) => ({ t, score: fitScore(t.key, signals) })).filter((x) => x.score > 0);
  if (scored.length === 0) return TITLE_TYPE_BY_KEY.curious;
  const best = Math.max(...scored.map((x) => x.score));
  const top = scored.filter((x) => x.score === best);
  const fresh = top.filter((x) => !recent.has(x.t.key));
  return (fresh.length ? fresh : top)[0]!.t;
}

/** 프롬프트에 넣을 지시 블록 — 유형 하나를 지정하고 그 약속까지 함께 준다. */
export function titleTypeDirective(t: TitleType): string {
  return [
    `★제목 유형: [${t.name}] — ${t.guide}`,
    `  결 예시(그대로 베끼지 말 것): "${t.example}"`,
    `  ★본문 이행 의무: ${t.payoff} 제목이 약속하고 본문이 안 지키면 낚시이고, 홈판에서 낚시는 이탈률로 즉시 되돌아온다.`,
  ].join("\n");
}
