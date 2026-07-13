// [species-c] §9 품질 게이트 — 규칙은 이 파일 한 곳에만. 하나라도 걸리면 사유와 함께 재생성.
import { BANNED_PHRASES, DISCLOSURE_TEXT, FAKE_EXPERIENCE_PATTERNS, FAKE_REVIEW_WORDS, FULLNAME_MAX_BODY, LINK_MARKER, REVIEW_QUOTE } from "./config";
import type { ArticleDraft, GateIssue, Product, QualityResult } from "./types";

const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}✔✅→↓↑]/u;

export function runQualityGate(draft: ArticleDraft, product: Product, mining?: { sampleSize: number; totalReviews: number }): QualityResult {
  const issues: GateIssue[] = [];
  const body = draft.body;
  const full = `${draft.titleSearch}\n${draft.titleHook}\n${body}\n${draft.tags.join(" ")}`;

  // 1. 대가성 문구 존재·위치(본문 앞 25% 안)
  const dIdx = body.indexOf(DISCLOSURE_TEXT);
  if (dIdx < 0) issues.push({ rule: "disclosure", detail: "대가성 고정 문구 부재" });
  else if (dIdx > body.length * 0.25) issues.push({ rule: "disclosure", detail: "대가성 문구가 본문 시작부(앞 25%)에 있지 않음" });

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

  // 5. 이모지·심볼
  const em = EMOJI_RE.exec(full);
  if (em) issues.push({ rule: "emoji", detail: `이모지·심볼 발견: ${em[0]}` });

  // 6. 리뷰 인용 길이·횟수
  const quotes = [...body.matchAll(/"([^"\n]{1,80})"/g)].map((m) => m[1]!);
  if (quotes.length > REVIEW_QUOTE.maxCount) issues.push({ rule: "quote-count", detail: `따옴표 인용 ${quotes.length}회(허용 ${REVIEW_QUOTE.maxCount})` });
  for (const q of quotes) if ([...q].length > REVIEW_QUOTE.maxLen) issues.push({ rule: "quote-length", detail: `인용 ${[...q].length}자(허용 ${REVIEW_QUOTE.maxLen}): "${q.slice(0, 20)}"` });

  // 7. 링크 교체 마커 정확히 2개
  const markers = body.split(LINK_MARKER).length - 1;
  if (markers !== 2) issues.push({ rule: "link-marker", detail: `링크 교체 마커 ${markers}개(정확히 2개 필요)` });

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
