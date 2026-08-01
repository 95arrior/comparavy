// ★제목 규격 코드 게이트(2026-07-08 유저 확정 — 검색 노출 공식) — 네이버는 제목으로 키워드를 판정한다.
//  원칙: 네이버가 알아먹게(키워드 1개·선두·병렬 금지) + 사람이 클릭하게(홈판용 훅). 프롬프트는 방향, 코드는 한계선.

const CATEGORY_NOUN = /(대출|적금|보험|청약|카드|연금|통장|펀드|공제|지원금|보조금|바우처|세금|예금)/g;
const BAD_CHARS = /[!@#$^&*=+_|<>{}\[\]\\\/"'`;:]|[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

function coreTokens(keyword: string): string[] {
  return keyword.split(/\s+/).map((t) => t.trim()).filter((t) => t.length >= 2);
}

export function validateSearchTitle(ts: string, keyword: string): { ok: boolean; reason?: string } {
  const len = [...ts].length;
  if (len < 25 || len > 40) return { ok: false, reason: `len_${len}` };
  if (BAD_CHARS.test(ts)) return { ok: false, reason: "bad_chars" };
  // 핵심 키워드 선두 배치 — 첫 토큰이 키워드 토큰으로 시작해야
  const toks = coreTokens(keyword);
  const head = ts.slice(0, 14);
  if (toks.length > 0 && !toks.some((t) => head.includes(t))) return { ok: false, reason: "keyword_not_front" };
  // 동급 키워드 병렬 금지 — 같은 카테고리 명사가 2회 이상 = "A대출 B대출" 유형
  const nouns = ts.match(CATEGORY_NOUN) ?? [];
  const uniq = new Set(nouns);
  for (const n of uniq) if (nouns.filter((x) => x === n).length >= 2) return { ok: false, reason: `parallel_${n}` };
  return { ok: true };
}

// ★홈판 제목 규격(2026-08-02 유저 확정 — "노잼 말고 재밌게") — 검색 제목과 배타다.
//  검색 제목은 네이버가 키워드를 판정하게 만드는 것이 임무라 25~40자·특수문자 금지·키워드 선두다.
//  홈판 제목은 스크롤을 멈추게 하는 것이 임무라 그 규격을 그대로 씌우면 훅이 죽는다.
//  그래서 규격을 따로 둔다 — 느낌표·물음표 1개씩 허용, 길이 여유, 키워드는 '어딘가에 있으면' 된다.
//  ★대신 어그로는 여기서도 막는다(금지어 필터는 hookPatterns.containsBanned가 별도로 담당).
const HOME_BAD_CHARS = /[@#$^&*=+_|<>{}\[\]\\\/`;]|[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

export function validateHomefeedTitle(title: string, keyword: string): { ok: boolean; reason?: string } {
  const t = (title ?? "").trim();
  const len = [...t].length;
  if (len < 20 || len > 45) return { ok: false, reason: `len_${len}` };
  if (HOME_BAD_CHARS.test(t)) return { ok: false, reason: "bad_chars" };
  // 느낌표·물음표는 각 1개까지 — 있으면 훅이 살고, 둘 이상이면 유튜브식 어그로가 된다.
  if ((t.match(/!/g)?.length ?? 0) > 1) return { ok: false, reason: "excl_overuse" };
  if ((t.match(/\?/g)?.length ?? 0) > 1) return { ok: false, reason: "quest_overuse" };
  // ★키워드 포함은 요구하지 않는다(2026-08-02 실측으로 철회).
  //  처음엔 검색 제목과 같이 '키워드가 제목에 있어야' 한다고 걸었는데, 홈판 카드의 keyword는
  //  검색 키워드가 아니라 **주제 앵커(소재)**다(HomefeedBet.keyword 주석). 그래서 좋은 제목이 대량으로 죽었다:
  //    앵커 "7월 미환급금"  ← 제목 "이번 달 월급 들어오기 전에, 안 찾아간 내 돈 먼저 확인하세요" (실측 탈락)
  //    앵커 "월급날 자동이체 함정" ← 제목 "월급 들어오자마자 적금 넣는 게 손해일 수 있는 이유" (실측 탈락 — '월급날'≠'월급')
  //  홈판은 키워드로 노출을 판정받는 게임이 아니라 반응(클릭·체류)으로 판정받는 게임이라
  //  키워드 포함은 애초에 요건이 아니다. 앵커와 제목은 같은 LLM 호출에서 함께 나오므로 주제 이탈 위험도 낮다.
  return { ok: true };
}

// ★지난 달 시의성 게이트(2026-08-02 유저 실측: 8월 2일에 "7월에 무이자 할부 쓰면" 카드가 떴다 — 4장 전부 지난달).
//  원인은 홈판 카드 프롬프트에 오늘 날짜가 안 들어가던 것이고(모델이 달을 찍었다), 프롬프트를 고쳐도
//  모델은 또 틀릴 수 있으니 코드가 한계선을 잡는다(CLAUDE.md).
//  ★'지난 달'만 막는다 — 다가올 달(9월 재산세 예고 등)은 선행 발행 전략상 정상이다.
//   ★뒤에 조사가 붙어도 잡아야 한다('7월에·7월부터·7월분') — 처음에 (?![가-힣]) 부정탐색을 넣었다가
//    정작 실측 사고 문구인 "7월에 무이자 할부"가 통과했다. '12개월·6개월'은 숫자 뒤가 '개'라
//    이 패턴에 애초에 걸리지 않으므로 부정탐색이 필요 없다.
export function staleMonthIn(text: string, now: Date = new Date()): number | null {
  const kst = new Date(now.getTime() + 9 * 3600_000);
  const cur = kst.getUTCMonth() + 1;
  for (const m of String(text || "").matchAll(/(\d{1,2})\s?월/g)) {
    const mm = Number(m[1]);
    if (mm < 1 || mm > 12) continue;
    const behind = (cur - mm + 12) % 12; // 1~6이면 지난 달로 본다(7 이상은 다가올 달로 해석)
    if (behind >= 1 && behind <= 6) return mm;
  }
  return null;
}

/** 게이트 위반 시 규칙 조립 폴백 — 키워드 실값 + 일반 수식만(지어낼 것이 없는 조합), 25~40자 맞춤. */
export function fallbackSearchTitle(keyword: string): string {
  const kw = keyword.trim();
  const candidates = [
    `${kw} 조건과 신청 방법, 순서대로 총정리`,
    `${kw} 신청 전 확인할 조건과 기간, 방법 정리`,
    `${kw} 조건부터 신청 방법과 기간까지 한눈에 정리`,
    `${kw} 알아보기 전 꼭 확인할 조건과 신청 순서 정리`,
  ];
  for (const c of candidates) { const n = [...c].length; if (n >= 25 && n <= 40) return c; }
  const base = `${kw} 조건부터 신청 방법과 기간까지 한눈에 정리`;
  return [...base].length > 40 ? [...base].slice(0, 40).join("") : base;
}

/** 홈판용 제목에 키워드 핵심 토큰이 하나도 없으면(훅만 남은 제목) 검색형으로 강등 — 키워드 없는 제목은 노출 판정 자체가 안 된다. */
export function ensureKeywordInTitle(title: string, keyword: string, searchTitle: string): string {
  const toks = coreTokens(keyword);
  if (toks.length === 0) return title;
  return toks.some((t) => title.includes(t)) ? title : searchTitle;
}
