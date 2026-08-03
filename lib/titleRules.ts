// ★제목 규격 코드 게이트(2026-07-08 유저 확정 — 검색 노출 공식) — 네이버는 제목으로 키워드를 판정한다.
//  원칙: 네이버가 알아먹게(키워드 1개·선두·병렬 금지) + 사람이 클릭하게(홈판용 훅). 프롬프트는 방향, 코드는 한계선.

const CATEGORY_NOUN = /(대출|적금|보험|청약|카드|연금|통장|펀드|공제|지원금|보조금|바우처|세금|예금)/g;
const BAD_CHARS = /[!@#$^&*=+_|<>{}\[\]\\\/"'`;:]|[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

function coreTokens(keyword: string): string[] {
  return keyword.split(/\s+/).map((t) => t.trim()).filter((t) => t.length >= 2);
}

// ★실검색어 표기 복원(2026-08-02 — 유저가 실성과에서 역추적).
//  사람들은 '실업급여조건'을 치는데 우리는 보기 좋게 '실업급여 조건'으로 쓴다. 그 순간 질의-문서 정합이 깨진다.
//  자동완성이 알려주는 건 '무엇을 검색하는가'만이 아니라 '어떻게 표기해서 치는가'다 — 맞춤법보다 실제 표기가 먼저다.
//  압축했을 때 같은 문자열이 제목 안에 있으면, 그 구간을 실검색어 표기로 되돌린다(뜻은 그대로, 표기만 교정).
export function restoreSearchPhrase(title: string, phrase: string): string {
  const t = String(title || ""), p = String(phrase || "").trim();
  if (!t || !p || t.includes(p)) return t;
  const chars = [...p.replace(/\s+/g, "")];
  if (chars.length < 2) return t;
  // 글자 사이에 공백이 끼어 있어도 잡는다: '실업급여 조건' ← '실업\s*급여\s*조\s*건'
  const re = new RegExp(chars.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s*"));
  return re.test(t) ? t.replace(re, p) : t;
}

export function validateSearchTitle(ts: string, keyword: string): { ok: boolean; reason?: string } {
  const len = [...ts].length;
  if (len < 25 || len > 40) return { ok: false, reason: `len_${len}` };
  if (BAD_CHARS.test(ts)) return { ok: false, reason: "bad_chars" };
  // 핵심 키워드 선두 배치 — 첫 토큰이 키워드 토큰으로 시작해야
  const toks = coreTokens(keyword);
  const head = ts.slice(0, 14);
  // ★두 어절 이상 실검색어는 아래 '통째로 + 앞쪽 절반' 규칙이 맡는다.
  //  옛 토큰 규칙(앞 14자 안에 토큰 하나)을 함께 걸면 유저 지급 예시가 죽는다 —
  //  "현실적으로 숨만 쉬어도 나가는 4인가족 한달 생활비 수준"은 앞 14자가 전부 어그로다(실측).
  const multiWord = keyword.trim().split(/\s+/).length >= 2;
  if (!multiWord && toks.length > 0 && !toks.some((t) => head.includes(t))) return { ok: false, reason: "keyword_not_front" };
  // ★실검색어를 '통째로, 표기 그대로' 담았는가(2026-08-02 유저 실성과 역추적 → 같은 날 유저가 교정).
  //  1차로 '맨 앞 고정'을 걸었더니 유저가 바로 잡았다 — 그건 제목을 전부 같은 틀로 만든다.
  //   유저 예시: "현실적으로 숨만 쉬어도 나가는 [4인가족 한달 생활비] 수준"
  //   → 어그로가 문을 열고, 실검색어가 통째로 박히고, 뒤가 받친다. 검색어는 앞이 아니라 '안'에 있다.
  //  ★그래서 지키는 건 둘이다: 통째로 있을 것(쪼개지 마라) + 앞쪽 절반에 있을 것(꼬리에 붙이면 약하다).
  //  한 어절짜리(굵은 머리말)엔 걸지 않는다 — 그건 어차피 아무 데나 들어간다.
  const kwTrim = keyword.trim();
  if (kwTrim.split(/\s+/).length >= 2) {
    const cmp = (x: string) => x.replace(/\s+/g, "").toLowerCase();
    const tc = cmp(ts), kc = cmp(kwTrim);
    // ★위치는 안 본다(2026-08-02 — 내가 두 번 과하게 잡았고 두 번 다 유저 예시가 죽었다).
    //  '맨 앞 고정' → 유저 교정. 그다음 '앞쪽 절반' → 유저가 준 예시 자체가 탈락했다:
    //  "현실적으로 숨만 쉬어도 나가는|4인가족 한달 생활비|수준"은 문구가 24자 중 13번째에서 시작한다.
    //  ★유저 규칙은 하나다 — 검색어를 통째로, 표기 그대로. 어그로를 어디에 두느냐는 창작의 몫이다.
    if (!tc.includes(kc)) return { ok: false, reason: "phrase_split" }; // 쪼개져 들어감 = 검색어가 아니게 됨
  }
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
// ═══ 발행 제목 꼬리 게이트(2026-08-04 유저: "빡세게 잡아주세요. 계속 실패가 나오면 안 됩니다") ═══
//  상위 44개 실측의 핵심은 '어떻게 끝맺느냐'였다. 그런데 프롬프트로만 두니 계속 샜다 —
//  '~정리'·'~방법'·'~기초'·'~내용'이 반복해서 통과했다(유저가 네 번 잡아냈다).
//  ★꼬리는 판정이 확실하다. 수식절 유무는 오탐 위험이 커서 프롬프트에 남기고, 꼬리만 코드로 막는다.
//  ★공통점: 상위 제목은 전부 '명사(구)'로 끝난다 — 종결어미로 닫지 않고, 안내형 명사로도 닫지 않는다.

/** 답까지 줘 버리는 안내형 꼬리 — 이걸로 끝나면 클릭할 이유가 없다. */
const DEAD_TAIL_RE = /(총정리|정리|방법|기초|내용|안내|가이드|알아야\s*할\s*것들?|확인하는\s*법|보는\s*법|하는\s*법|시작할까|이것만\s*알면|모음|리스트)$/;
/** 문장으로 닫힌 제목 — 그 자체로 답처럼 읽혀 들어올 이유가 줄어든다. */
const CLOSED_SENT_RE = /(습니다|됩니다|입니다|합니다|드립니다|있습니다|없습니다|해요|예요|이에요|네요)$/;
/** 뉴스 헤드라인을 그대로 옮긴 흔적 — 말줄임표는 우리가 쓸 문장부호가 아니다. */
const HEADLINE_RE = /(\.\.\.|…)/;

/**
 * 발행 제목·카드 제목 공통 꼬리 검사. ok=false면 그 제목은 규격 미달이다.
 * ★검사 대상은 '끝맺음'뿐이다 — 수식절 유무까지 코드로 재면 멀쩡한 제목이 죽는다
 *  (실측 44개 중 '생각없이 …쓴 신혼부부의 후회'처럼 수식절 형태가 다양하다).
 */
export function validateTitleTail(title: string): { ok: boolean; reason?: string } {
  const t = String(title || "").trim().replace(/[?!.]+$/, "");
  if (!t) return { ok: false, reason: "제목이 비었다" };
  if (HEADLINE_RE.test(title)) return { ok: false, reason: "말줄임표(…)가 있다 — 뉴스 헤드라인을 그대로 옮긴 흔적이다. 우리 문장으로 다시 써라" };
  if (CLOSED_SENT_RE.test(t)) {
    const tail = (t.match(CLOSED_SENT_RE) ?? [""])[0];
    return { ok: false, reason: `'${tail}'로 문장을 닫았다 — 닫힌 제목은 답처럼 읽혀 클릭할 이유가 없다. 명사구나 전언형('~다는 현실','~한 이유','~ 기준')으로 끊어라` };
  }
  if (DEAD_TAIL_RE.test(t)) {
    const tail = (t.match(DEAD_TAIL_RE) ?? [""])[0];
    return { ok: false, reason: `'${tail}'로 끝났다 — 답까지 준 안내형 꼬리다. 궁금한 채로 끊어라('~다는 현실','~하는 사람 특징','~한 이유','~ 기준','~ 경우의 수')` };
  }
  return { ok: true };
}

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
  // ★2026-08-02 유저 실측 — 화면에 '개인신용정보서 총정리'가 떴다. 그건 창작이 아니라 이 폴백이었다.
  //  '총정리'는 유저가 금지한 틀이고(썸네일 카피 금지어에도 있다), 무엇보다 폴백이 자주 발동할수록
  //  모든 글감이 같은 얼굴이 된다. 폴백도 제목이어야 한다 — 검색어를 살리면서 궁금하게.
  //  ★유저 지급 결: "현실적으로 숨만 쉬어도 나가는 4인가족 한달 생활비 수준"
  const candidates = [
    `${kw}, 모르고 넘어가면 나만 손해입니다`,
    `${kw}, 신청 전에 이것부터 확인하세요`,
    `${kw} 하기 전에 놓치기 쉬운 것들`,
    `막상 해보면 헷갈리는 ${kw}, 순서대로 정리했습니다`,
    `${kw}, 처음이라면 여기부터 보세요`,
  ];
  for (const c of candidates) { const n = [...c].length; if (n >= 25 && n <= 40) return c; }
  const base = `${kw}, 신청 전에 이것부터 확인하세요`;
  return [...base].length > 40 ? [...base].slice(0, 40).join("") : base;
}

/** 홈판용 제목에 키워드 핵심 토큰이 하나도 없으면(훅만 남은 제목) 검색형으로 강등 — 키워드 없는 제목은 노출 판정 자체가 안 된다. */
export function ensureKeywordInTitle(title: string, keyword: string, searchTitle: string): string {
  const toks = coreTokens(keyword);
  if (toks.length === 0) return title;
  return toks.some((t) => title.includes(t)) ? title : searchTitle;
}
