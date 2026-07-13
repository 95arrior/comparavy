// [species-c] §9 품질 게이트 — 규칙은 이 파일 한 곳에만. 하나라도 걸리면 사유와 함께 재생성.
import { BANNED_PHRASES, DISCLOSURE_TEXT, FAKE_EXPERIENCE_PATTERNS, FULLNAME_MAX_BODY, LINK_MARKER, REVIEW_QUOTE } from "./config";
import type { ArticleDraft, GateIssue, Product, QualityResult } from "./types";

const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}✔✅→↓↑]/u;

export function runQualityGate(draft: ArticleDraft, product: Product): QualityResult {
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

  // 9. 마크다운 문법 유출(에디터 노출 사고 방지)
  if (/^#{1,3}\s|\*\*|^-\s/m.test(body)) issues.push({ rule: "markdown-leak", detail: "마크다운 문법(#, **, - ) 발견 — 플레인 텍스트 위반" });

  return { pass: issues.length === 0, issues };
}

/** 제목-키워드 정합은 메인 키워드를 알아야 해서 별도 함수(§9-8). */
export function checkTitleKeyword(title: string, mainKeyword: string): GateIssue | null {
  const toks = mainKeyword.split(/\s+/).filter((t) => t.length >= 2);
  const missing = toks.filter((t) => !title.replace(/\s+/g, "").includes(t.replace(/\s+/g, "")));
  if (missing.length) return { rule: "title-keyword", detail: `검색 제목에 키워드 토큰 누락: ${missing.join(", ")}` };
  return null;
}
