// ★본문 마감 조립 — 한 곳(2026-08-04 유저 화면에서 검거).
//  실물: 뽑은 글에 '함께 보면 좋은 글' 링크도, 해시태그도 없었다.
//  진범은 경로가 둘이라는 것이었다 — /api/generate에는 마감 단계가 다 있는데,
//  /api/pregen(카드에서 바로 열리게 미리 뽑아두는 경로)에는 URL 정화까지만 있고
//  리스트→표·분량 하드컷·관련글·해시태그가 통째로 빠져 있었다.
//  주석엔 "후처리(generate와 동일)"이라고 적혀 있었는데 동일하지 않았다.
//  ★CLAUDE.md의 반복 교훈 그대로다: 규칙을 소스별로 복붙하면 반드시 빠지는 경로가 생긴다.
//   그래서 마감은 이 함수 하나로만 한다 — 새 마감 규칙은 여기에만 추가한다.
import { ensureHashtags, ensureRelatedLinks, hardTrimToLimit, stripStilted } from "./editorial";
import { ensureDisclosure } from "./revenue";
import { listToTable } from "./publishHtml";
import { sanitizeUrls } from "./linkWhitelist";
import { countBodyChars } from "./humanizer";

export interface FinalizeInput {
  bodyHtml: string;
  keyword: string;
  isReview: boolean;
  ownNaverBlogId?: string | null;
  /** 같은 블로그의 확정 URL 글(관련글 후보). 없으면 링크 없이 간다. */
  relatedPosts?: { title: string; url: string }[];
  /** 모델이 만든 태그(해시태그 1순위 재료) */
  modelTags?: unknown;
  tag?: string;
}

export interface FinalizeResult {
  html: string;
  charCount: number;
  /** 계측용 — 호출측이 로그로 남긴다(무엇이 실제로 일어났는지가 보여야 한다) */
  tabled: boolean;
  /** 어색한 감탄사를 걷어냈는가 */
  destilted: boolean;
  trimmedSections: string[];
  urlReplaced: number;
  fabricatedUrls: string[];
  relatedAdded: number;
}

/** 저장 직전 본문 마감. 순서가 곧 규칙이다 — 표로 바꾸고, 분량을 자르고, 주소를 정화한 뒤, 링크·태그를 붙인다. */
export function finalizeArticleBody(input: FinalizeInput): FinalizeResult {
  const src0 = String(input.bodyHtml || "");
  // ⓪ 어색한 감탄사 제거(2026-08-04 유저: "허참 같은 거 쓰지 마요") — 문장 첫머리 감탄사만 걷어낸다
  const src = stripStilted(src0);
  // ① 리스트 → 표(저장물에 적용해야 인포그래픽 API가 <table>을 찾는다)
  const tabled = listToTable(src);
  // ② 분량 하드컷 — 뒤에서부터 섹션 단위로(문장 중간을 자르면 글이 망가진다)
  const trim = hardTrimToLimit(tabled, countBodyChars);
  // ③ 대가성 고지 + URL 정화(내 블로그 전편 링크는 통과)
  const clean = sanitizeUrls(ensureDisclosure(trim.html, input.isReview), { allowNaverBlogId: input.ownNaverBlogId });
  // ④ 함께 보면 좋은 글 — 모델 마커는 버리고 코드가 붙인다(후보 없으면 안 붙는다)
  const related = input.relatedPosts ?? [];
  const withLinks = ensureRelatedLinks(clean.html, related);
  const relatedAdded = (withLinks.match(/\[마무리관련글:/g) ?? []).length;
  // ⑤ 해시태그 — 모델이 빠뜨려도 여기서 채운다
  const html = ensureHashtags(withLinks, input.keyword, input.tag, input.modelTags);
  return {
    html,
    charCount: countBodyChars(html),
    tabled: tabled !== src,
    destilted: src !== src0,
    trimmedSections: trim.removed,
    urlReplaced: clean.replaced,
    fabricatedUrls: clean.fabricated,
    relatedAdded,
  };
}
