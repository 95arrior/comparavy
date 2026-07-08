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
