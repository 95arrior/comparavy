// [species-c] §9 품질 게이트 — 규칙은 이 파일 한 곳에만. 하나라도 걸리면 사유와 함께 재생성.
import { ALWAYS_BANNED_WORDS, BANNED_PHRASES, CLAIM_PATTERNS, CRINGE_PATTERNS, PRODUCT_IMG_RANGE, DISCLOSURE_TEXT, FAKE_EXPERIENCE_PATTERNS, FAKE_REVIEW_WORDS, FULLNAME_MAX_BODY, MARKER_LINK_1, MARKER_LINK_2, MARKER_PRODUCT_IMG, MARKER_REVIEW_CARD, REVIEW_QUOTE } from "./config";
import type { ArticleDraft, GateIssue, Product, QualityResult } from "./types";

// 문체 v2(2026-07-14): 이모지는 본문 존 규칙(8~12개·금지 존), 특수 심볼(화살표·체크)은 여전히 전면 금지
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2757}\u{2764}\u{FE0F}]/gu;
const SYMBOL_BAN_RE = /[→↓↑✓✗]/;

export function runQualityGate(draft: ArticleDraft, product: Product, mining?: { sampleSize: number; totalReviews: number }): QualityResult {
  const issues: GateIssue[] = [];
  const body = draft.body;
  const full = `${draft.titleSearch}\n${draft.titleHook}\n${body}\n${draft.tags.join(" ")}`;

  // 1. ★대가성 문구 — 공식 문구가 '본문 첫 줄'(규정 정합 라운드)
  const firstLine = body.split("\n")[0]?.trim() ?? "";
  if (!body.includes(DISCLOSURE_TEXT)) issues.push({ rule: "disclosure", detail: "대가성 공식 문구 부재" });
  else if (firstLine !== DISCLOSURE_TEXT) issues.push({ rule: "disclosure", detail: `대가성 문구가 본문 첫 줄이 아님(첫 줄: "${firstLine.slice(0, 24)}…")` });

  // 2-00. ★오글 멘트(유저 실측: "판매왕 양심에 걸고 과장 없이 정성으로만")
  for (const cr of CRINGE_PATTERNS) {
    const m = cr.exec(full);
    if (m) issues.push({ rule: "cringe", detail: `오글 멘트: "${m[0]}" — 신뢰 선언 금지(데이터로 보여준다)` });
  }
  // 2-0. ★기능 단정(외부 검수 반영) — 사실처럼 단정 금지, 완곡 프레임 강제
  for (const cp of CLAIM_PATTERNS) {
    const m = cp.re.exec(body);
    if (m) issues.push({ rule: "claim-hedge", detail: `기능 단정: "${m[0]}" → 권장: ${cp.fix}` });
  }
  // 2. 과장·보장 표현
  for (const ph of BANNED_PHRASES) if (full.includes(ph)) issues.push({ rule: "banned-phrase", detail: `금지 표현: "${ph}"` });

  // 3. 가짜 1인칭 사용감(실사용 입력 없을 때)
  if (!product.myExperience) {
    for (const re of FAKE_EXPERIENCE_PATTERNS) {
      const m = re.exec(body);
      if (m) issues.push({ rule: "fake-experience", detail: `실사용 입력 없는데 직접 경험 서술: "${m[0]}"` });
    }
  }

  // 4. 제품 풀네임 반복(제목 제외 본문 기준)
  const nameEsc = product.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nameCount = (body.match(new RegExp(nameEsc, "g")) ?? []).length;
  if (nameCount > FULLNAME_MAX_BODY) issues.push({ rule: "fullname-repeat", detail: `제품 풀네임 본문 ${nameCount}회(허용 ${FULLNAME_MAX_BODY})` });

  // 5. 이모지 v2(존·상한) + 심볼 전면 금지
  const sym = SYMBOL_BAN_RE.exec(full);
  if (sym) issues.push({ rule: "symbol", detail: `특수 심볼(AI 문체): ${sym[0]}` });
  if (((`${draft.titleSearch}${draft.titleHook}${draft.tags.join("")}`).match(EMOJI_RE) ?? []).length > 0) issues.push({ rule: "emoji-title", detail: "제목·태그 이모지 전면 금지" });
  const emojiCount = (body.match(EMOJI_RE) ?? []).length;
  if (emojiCount > 12 || emojiCount < 8) issues.push({ rule: "emoji-count", detail: `본문 이모지 ${emojiCount}개(허용 8~12)` });
  // 금지 존: 대가성 문구 문단
  const paras = body.split(/\n{2,}/);
  const discPara = paras.find((pp) => pp.includes(DISCLOSURE_TEXT));
  if (discPara && (discPara.match(EMOJI_RE) ?? []).length > 0) issues.push({ rule: "emoji-zone", detail: "대가성 고지 문단에 이모지" });
  // 금지 존: 수치·가격 문장 / 단점 인정 문장
  for (const sen of body.split(/(?<=[.!?…])\s+|\n+/)) { // 줄바꿈도 문장 경계(실측 오탐: 구두점 없는 소제목이 다음 문단과 합쳐짐)
    if (((sen.match(EMOJI_RE) ?? []).length) === 0) continue;
    if (/[\d][\d,.]*\s*(원|%|건|개월|분|시간|W|ml|kg)/.test(sen)) { issues.push({ rule: "emoji-zone", detail: `수치·가격 문장에 이모지: "${sen.slice(0, 24)}…"` }); break; }
    if (/(아쉬|단점|못 팝니다|불만)/.test(sen)) { issues.push({ rule: "emoji-zone", detail: `단점 인정 문장에 이모지: "${sen.slice(0, 24)}…"` }); break; }
  }
  // ★문단 리듬(v2): 문단당 최대 2문장·150자(줄바꿈 목록은 줄 단위로)
  for (const pp of paras) {
    const plain = pp.trim();
    if (!plain || plain.startsWith("[") || plain === DISCLOSURE_TEXT) continue;
    const units = plain.includes("\n") ? plain.split("\n") : [plain];
    for (const u of units) {
      const senCount = (u.match(/[.!?…]+(?=\s|$)/g) ?? []).length;
      if (senCount > 2 || [...u].length > 150) { issues.push({ rule: "paragraph-rhythm", detail: `문단 과밀(${senCount}문장·${[...u].length}자): "${u.slice(0, 24)}…"` }); break; }
    }
  }
  // ★하이라이트 마커(v2): ==핵심 문장== 2~4곳
  const hl = (body.match(/==[^=\n]{4,80}==/g) ?? []).length;
  if (hl < 2 || hl > 4) issues.push({ rule: "highlight-count", detail: `하이라이트 마커 ${hl}곳(허용 2~4)` });

  // 6. 리뷰 인용 길이·횟수 — 도입 속마음 대사 1회(앞 200자·30자 이내)는 별도 허용
  const qm = [...body.matchAll(/"([^"\n]{1,80})"/g)];
  const hasIntro = qm.length > 0 && (qm[0]!.index ?? 0) < 200;
  const introQ = hasIntro ? qm[0]![1]! : null;
  if (introQ && [...introQ].length > 30) issues.push({ rule: "quote-length", detail: `도입 대사 ${[...introQ].length}자(허용 30)` });
  const quotes = (hasIntro ? qm.slice(1) : qm).map((m) => m[1]!);
  if (quotes.length > REVIEW_QUOTE.maxCount) issues.push({ rule: "quote-count", detail: `리뷰 인용 ${quotes.length}회(허용 ${REVIEW_QUOTE.maxCount})` });
  for (const q of quotes) if ([...q].length > REVIEW_QUOTE.maxLen) issues.push({ rule: "quote-length", detail: `인용 ${[...q].length}자(허용 ${REVIEW_QUOTE.maxLen}): "${q.slice(0, 20)}"` });

  // 7. ★마커 4종(이미지 구성 개편): 상품 이미지 1~2, 리뷰 분석 카드 1, 링크 1·2 각 1
  const cnt = (m: string) => body.split(m).length - 1;
  const pi = cnt(MARKER_PRODUCT_IMG);
  if (pi < PRODUCT_IMG_RANGE.min || pi > PRODUCT_IMG_RANGE.max) issues.push({ rule: "marker", detail: `${MARKER_PRODUCT_IMG} ${pi}곳(허용 ${PRODUCT_IMG_RANGE.min}~${PRODUCT_IMG_RANGE.max} — 글마다 변동)` });
  if (cnt(MARKER_REVIEW_CARD) !== 0) issues.push({ rule: "marker", detail: `${MARKER_REVIEW_CARD} 잔존 — 리뷰 카드 폐지(유저 확정: 상품 이미지·링크만)` });
  if (cnt(MARKER_LINK_1) !== 1 || cnt(MARKER_LINK_2) !== 1) issues.push({ rule: "marker", detail: `쇼핑커넥트 링크 마커 1·2가 각 1곳이어야 함(현재 ${cnt(MARKER_LINK_1)}·${cnt(MARKER_LINK_2)})` });
  if (/\[이미지:|\[쇼핑커넥트 링크 교체 위치\]/.test(body)) issues.push({ rule: "marker", detail: "구 마커 형식 잔존([이미지:…]/링크 교체 위치)" });

  // 8. 제목-메인 키워드 정합 + 앞 15자 훅 (기존 시스템 규칙의 취지를 독립 구현)
  //    검색 최적화 제목: 메인 키워드의 핵심 토큰(2자+)이 전부 포함 + 제목 30자 이내.
  if ([...draft.titleSearch].length > 34) issues.push({ rule: "title", detail: `검색 제목 ${[...draft.titleSearch].length}자(과長)` });

  // 10. ★신뢰 회계(라운드1 A-3 — 실측 사고: '3,128건 분석'인데 표본 8건 + '6회 언급' 절대 횟수)
  if (mining) {
    // 절대 횟수 단독 표기 전면 금지
    const abs = body.match(/\d+\s*(회|번)\s*(언급|반복|나왔|보였|등장)/);
    if (abs) issues.push({ rule: "absolute-count", detail: `절대 횟수 표기: "${abs[0]}" — 비율(N건 중 M건) 또는 정성 서술로` });
    // '분석·정독·읽었다' 주장 숫자는 표본 건수만 허용(표준 문구의 total은 예외)
    for (const m of body.matchAll(/([\d,]+)\s*건[^.\n]{0,10}(정독|분석|읽어|살펴봤|훑어봤)/g)) {
      const numRaw = m[1] ?? "";
      const num = Number(numRaw.replace(/,/g, ""));
      const ctx = body.slice(Math.max(0, (m.index ?? 0) - 12), (m.index ?? 0) + m[0].length);
      if (num !== mining.sampleSize && !ctx.includes("전체 리뷰")) {
        issues.push({ rule: "sample-claim", detail: `표본 아닌 숫자로 분석 주장: "${m[0]}" (실표본 ${mining.sampleSize}건)` });
      }
    }
  }
  // 11-0. ★내돈내산 무조건 금지(규정 정합 — 실사용 여부 무관)
  for (const w of ALWAYS_BANNED_WORDS) {
    if (full.includes(w)) issues.push({ rule: "always-banned", detail: `"${w}"는 실사용 여부와 무관하게 전면 금지(대가성 글)` });
  }
  // 11. ★후기 금지(라운드1 B-2) — 실사용 입력 없으면 제목·본문·태그에 후기류 단어 금지
  if (!product.myExperience) {
    for (const w of FAKE_REVIEW_WORDS) {
      if (draft.titleSearch.includes(w) || draft.titleHook.includes(w) || draft.tags.some((t) => t.includes(w))) {
        issues.push({ rule: "fake-review-word", detail: `실사용 없는데 제목·태그에 "${w}"` });
      }
    }
    for (const w of FAKE_REVIEW_WORDS) if (body.includes(w) && w !== "후기") issues.push({ rule: "fake-review-word", detail: `실사용 없는데 본문에 "${w}"` });
    if (/제?\s*후기를 남기|저의 후기/.test(body)) issues.push({ rule: "fake-review-word", detail: "실사용 없는데 본문이 자기 후기 화법" });
  }

  // 9. 마크다운 문법 유출(에디터 노출 사고 방지)
  if (/^#{1,3}\s|\*\*|^-\s/m.test(body)) issues.push({ rule: "markdown-leak", detail: "마크다운 문법(#, **, - ) 발견 — 플레인 텍스트 위반" });

  return { pass: issues.length === 0, issues };
}

// copied from lib/amplifyTopics.ts·lib/topicTitles.ts 제목 규칙(프롬프트 조항) — 독립 유지, 원본과 동기화하지 않음.
// ★앞 15자 자기검증(라운드1 B-2): 구체 숫자·대상 호명(~라면/~인 분)·질문(?)·따옴표 발화 중 1 필수. '총정리·확인하기·알아보기·방법·이유'는 훅이 아니다.
export function checkTitleHook15(title: string): GateIssue | null {
  const head = [...title].slice(0, 15).join("");
  const headWide = [...title].slice(0, 18).join(""); // 호명 어미(~라면)가 15자 경계에서 잘리는 엣지 — 어미 완성 여유 3자
  const hasHook = /\d/.test(head) || /(라면|이라면|인 분|하신 분|신다면|는 분)/.test(headWide) || /\?/.test(title) || /["\u201c\u201d']/.test(head);
  if (!hasHook) return { rule: "title-hook15", detail: `제목 앞 15자("${head}")에 훅 없음 — 숫자·대상 호명·질문·따옴표 발화 중 1 필수(총정리·방법·이유는 훅이 아님)` };
  return null;
}

/** 제목-키워드 정합은 메인 키워드를 알아야 해서 별도 함수(§9-8). */
export function checkTitleKeyword(title: string, mainKeyword: string): GateIssue | null {
  const toks = mainKeyword.split(/\s+/).filter((t) => t.length >= 2);
  const flat = title.replace(/\s+/g, "");
  const missing = toks.filter((t) => !flat.includes(t.replace(/\s+/g, "")));
  if (missing.length) return { rule: "title-keyword", detail: `검색 제목에 키워드 토큰 누락: ${missing.join(", ")}` };
  // ★앞 15자 훅(§9-8) — 핵심 토큰 중 하나는 제목 앞 15자 안에서 시작해야 한다(검색 결과 스캔은 앞머리만 읽힌다)
  const head = [...title].slice(0, 15).join("");
  if (!toks.some((t) => head.includes(t.replace(/\s+/g, "").slice(0, Math.min(4, t.length))))) {
    return { rule: "title-hook15", detail: `제목 앞 15자("${head}") 안에 메인 키워드 토큰 없음 — 키워드를 앞으로` };
  }
  return null;
}

/** ★1글 1바늘(키워드 확장 라운드 3): 제목에는 메인 키워드만 — 서브 키워드 문구가 제목에 오면 실격(서브는 본문 소제목에만). */
export function checkTitleSingleNeedle(title: string, subKeywords: string[], mainKeyword = ""): GateIssue | null {
  const flat = title.replace(/\s+/g, "");
  const mainFlat = mainKeyword.replace(/\s+/g, "");
  const shares5 = (a: string, b: string) => { // 5자+ 연속 공유 = 같은 키워드 가족(실측: 메인 '곰팡이 제거제 순위' vs 서브 '욕실 곰팡이 제거제')
    for (let i = 0; i + 5 <= a.length; i++) if (b.includes(a.slice(i, i + 5))) return true;
    return false;
  };
  for (const sub of subKeywords) {
    const sk = sub.replace(/\s+/g, "");
    if (sk.length >= 4 && flat.includes(sk) && !(mainFlat && shares5(sk, mainFlat))) {
      return { rule: "single-needle", detail: `제목에 서브 키워드 "${sub}" 포함 — 1글 1바늘(서브는 본문 소제목에만)` };
    }
  }
  return null;
}
