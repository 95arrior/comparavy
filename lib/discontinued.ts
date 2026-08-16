// ★폐지·종료 제도 사전(2026-08-01 유저 지시: "폐지 제도 이거 빡세게 잡아주세요, 네이버랑 워드프레스 둘다").
//
//  실측 발단: 글감 보드에 '재형저축'이 월 1,100 검색으로 떴고 제목이 "세금 우대받으며 모으는 방법"이었다.
//  재형저축은 2015년 말 신규 가입이 끝난 상품이다. 검색은 지금도 되지만(옛 가입자·궁금증) 지금 가입하러 가면
//  헛걸음한다. 이건 품질 문제가 아니라 **독자가 실제로 손해를 보는 오류**다.
//
//  ★값은 여기 한 곳에만 둔다(financeCalc의 RATES와 같은 원칙) — 두 곳에 있으면 반드시 갈라진다.
//  ★쓰는 곳: 글감 검문(cardFinalGate·wp-autopublish)과 본문 검사(factGate). 채널 양쪽 모두.
//
//  ★수록 기준: '지금 신규 가입·신청이 불가능한 것'만 ENDED에 넣는다. 애매하면 넣지 않는다 —
//   멀쩡한 글감을 죽이는 오탐이 더 비싸다. 제도는 부활·연장되므로 확신이 없으면 WATCH로 둔다.

export interface EndedProgram {
  /** 사람이 읽는 이름 */
  name: string;
  /** 본문·키워드에서 이 제도를 가리키는 표기들 */
  re: RegExp;
  /** 언제 끝났는지 — 안내 문구에 그대로 쓴다 */
  since: string;
  /** 지금 같은 목적으로 쓰는 제도(있으면). 글을 아예 버리지 않고 방향을 돌릴 수 있게. */
  replacement?: string;
}

/** 신규 가입·신청이 끝난 제도 — 글감 하드컷 + 본문 오류 검출. */
export const ENDED: EndedProgram[] = [
  { name: "재형저축", re: /재형\s*저축|근로자\s*재산\s*형성\s*저축/, since: "2015년 말 신규 가입 종료", replacement: "ISA(개인종합자산관리계좌)·청년도약계좌" },
  { name: "소득공제장기펀드", re: /소득\s*공제\s*장기\s*펀드|소장\s*펀드/, since: "2015년 말 신규 가입 종료", replacement: "연금저축·IRP" },
  { name: "청년희망적금", re: /청년\s*희망\s*적금/, since: "2022년 한시 운영 후 신규 가입 종료", replacement: "청년도약계좌" },
  { name: "청년우대형 청약통장", re: /청년\s*우대형\s*(?:주택)?\s*청약\s*(?:종합)?\s*저축|청년\s*우대형\s*청약\s*통장/, since: "2023년 말 신규 가입 종료", replacement: "청년주택드림 청약통장" },
  { name: "장기주택마련저축", re: /장기\s*주택\s*마련\s*저축|장마\s*저축/, since: "신규 가입·비과세 종료", replacement: "주택청약종합저축·ISA" },
  { name: "세금우대종합저축", re: /세금\s*우대\s*종합\s*저축/, since: "2014년 말 폐지", replacement: "비과세종합저축" },
  { name: "생계형저축", re: /생계형\s*저축/, since: "2014년 말 비과세종합저축으로 통합", replacement: "비과세종합저축" },
  { name: "근로자우대저축", re: /근로자\s*우대\s*저축/, since: "폐지", replacement: "ISA·청년도약계좌" },
  { name: "연금저축신탁", re: /연금\s*저축\s*신탁/, since: "2018년부터 신규 판매 중단", replacement: "연금저축펀드·연금저축보험" },
  { name: "청약저축·청약예금·청약부금", re: /청약\s*저축(?!\s*액)|청약\s*예금|청약\s*부금/, since: "주택청약종합저축으로 일원화되며 신규 가입 중단", replacement: "주택청약종합저축" },
  // 코로나 한시 지원 — 전부 종료됐는데 검색은 계속 남아 있다
  { name: "긴급재난지원금", re: /긴급\s*재난\s*지원금/, since: "코로나 한시 지원으로 종료" },
  { name: "소상공인 버팀목자금", re: /버팀목\s*자금/, since: "코로나 한시 지원으로 종료" },
  { name: "새희망자금", re: /새희망\s*자금/, since: "코로나 한시 지원으로 종료" },
  { name: "희망회복자금", re: /희망\s*회복\s*자금/, since: "코로나 한시 지원으로 종료" },
  { name: "소상공인 손실보상", re: /손실\s*보상금?(?!\s*법)/, since: "코로나 한시 지원으로 종료" },
];

/** 이 표현들이 근처에 있으면 '끝난 걸 알고 쓰는 글'이라 오류가 아니다. */
const AWARE_RE = /종료|폐지|중단|없어졌|사라졌|더\s*이상|불가능|안\s*됩니다|못\s*합니다|가입할\s*수\s*없|신규\s*(?:가입|신청)\s*(?:이|은)?\s*(?:안|불)|옛|과거|예전|당시|한시/;

/**
 * 지금 가입·신청할 수 있는 것처럼 쓰는 '행동' 표현.
 * ★행동어만 본다(2026-08-01 오탐 수리) — '비교·추천·한도' 같은 말은 회고 문장에도 흔하다.
 *  실측 오탐: "재형저축 시절과 비교하면 지금 상품은 구조가 다릅니다"가 걸렸다.
 *  글감 단계에서 이미 이름만으로 하드컷하므로, 본문 검사는 보수적으로 가는 게 맞다(오탐이 더 비싸다).
 */
const AVAILABLE_RE = /가입|신청|개설|만들\s*수|들어\s*두|드는\s*법/;

/** 키워드가 폐지 제도를 가리키는가 — 글감 단계에서 쓴다(맥락이 없으므로 이름만 본다). */
export function endedProgramOf(text: string): EndedProgram | null {
  const t = (text ?? "").trim();
  if (!t) return null;
  return ENDED.find((p) => p.re.test(t)) ?? null;
}

export interface EndedHit {
  program: EndedProgram;
  /** 걸린 문장(사람이 확인할 수 있게) */
  context: string;
}

/**
 * 본문에서 '폐지된 제도를 지금 가입 가능한 것처럼' 쓴 자리를 찾는다.
 * ★끝난 걸 명시한 문장은 통과시킨다 — 폐지 사실을 설명하는 글까지 막으면 게이트가 죽는다.
 */
export function findEndedMisuse(plainText: string): EndedHit[] {
  const hits: EndedHit[] = [];
  const blocks = (plainText ?? "").split(/\n+/);
  for (const p of ENDED) {
    for (const b of blocks) {
      if (!p.re.test(b)) continue;
      if (AWARE_RE.test(b)) continue;      // 종료를 알고 쓴 문장
      if (!AVAILABLE_RE.test(b)) continue; // 가입·신청 맥락이 아니면 단순 언급
      hits.push({ program: p, context: b.replace(/\s+/g, " ").trim().slice(0, 90) });
      break; // 제도당 한 번만
    }
  }
  return hits;
}

/** 안내 문구 — 무엇을 어떻게 고칠지까지. */
export function endedNotice(p: EndedProgram): string {
  return `${p.name}은(는) ${p.since}입니다. 지금 가입할 수 있는 것처럼 쓰면 독자가 헛걸음합니다.${p.replacement ? ` 지금 같은 목적으로 쓰는 건 ${p.replacement}입니다 — 그쪽으로 방향을 돌리거나, '${p.name}은 지금 신규 가입이 안 된다'를 명시하세요.` : " '지금은 종료됐다'를 명시하세요."}`;
}
