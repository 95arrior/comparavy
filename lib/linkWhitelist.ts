// ★검증 링크 사전(화이트리스트) — 본문에 허용되는 URL은 이 루트뿐(딥 경로 금지).
//  등록 조건: 배포 시 HTTP 200 확인(2026-07-04 전 항목 200). 엔진이 기억으로 경로를 재조립해 404를 만드는
//  치명 버그의 이중 방어 — ①엔진 규칙(URL 경로 금지) ②이 후처리(사전 밖 URL 치환).
export const VERIFIED_LINKS: Record<string, { root: string; name: string }> = {
  "gov.kr": { root: "https://www.gov.kr", name: "정부24" },
  "bokjiro.go.kr": { root: "https://www.bokjiro.go.kr", name: "복지로" },
  "hometax.go.kr": { root: "https://hometax.go.kr", name: "홈택스" },
  "nts.go.kr": { root: "https://www.nts.go.kr", name: "국세청" },
  "nhis.or.kr": { root: "https://www.nhis.or.kr", name: "건강보험공단" },
  "semas.or.kr": { root: "https://semas.or.kr", name: "소상공인시장진흥공단" },
  "work24.go.kr": { root: "https://www.work24.go.kr", name: "고용24" },
  "adpost.naver.com": { root: "https://adpost.naver.com", name: "애드포스트" },
  "mate.naver.com": { root: "https://mate.naver.com", name: "네이버 메이트" },
  // ★경제·재테크 기관(2026-07-31 추가) — 실측 사고에서 출발했다: 엔진이 자본시장연구원 도메인을
  //  'cmri.re.kr'로 지어내 본문에 실었다(실제는 kcmi.re.kr). 사전에 없으면 매번 '검색 유도'로 마스킹되니
  //  자주 인용할 기관은 정답을 등재해 두는 편이 지어내기를 줄인다.
  //  HTTP 200 실측(2026-07-31): fsc·fss·kdic·bok·nps·dart·krx.
  "fsc.go.kr": { root: "https://www.fsc.go.kr", name: "금융위원회" },
  "fss.or.kr": { root: "https://www.fss.or.kr", name: "금융감독원" },
  "kdic.or.kr": { root: "https://www.kdic.or.kr", name: "예금보험공사" },
  "bok.or.kr": { root: "https://www.bok.or.kr", name: "한국은행" },
  "nps.or.kr": { root: "https://www.nps.or.kr", name: "국민연금공단" },
  "dart.fss.or.kr": { root: "https://dart.fss.or.kr", name: "전자공시시스템" },
  "krx.co.kr": { root: "https://www.krx.co.kr", name: "한국거래소" },
  // ⚠ kcmi.re.kr — 이 환경(CLI)에서는 응답이 없어 자동 200 확인이 안 됐다(브라우저 외 요청 차단으로 보인다).
  //   유저가 브라우저로 실재를 확인해 등재. 다음 점검 때 200을 다시 확인할 것.
  "kcmi.re.kr": { root: "https://www.kcmi.re.kr", name: "자본시장연구원" },
};

// URL 패턴 — http(s) 명시 + 맨몸 도메인(gov.kr/portal… 형태)까지.
export const URL_RE = /https?:\/\/[^\s<>"')\]]+|(?<![\w.@/])(?:[a-z0-9-]+\.)+(?:go\.kr|or\.kr|co\.kr|kr|com|net|org)(?:\/[^\s<>"')\]]*)?/gi;

// 치환 자리표 — 도메인을 즉시 문구로 바꾸지 않고, 문맥을 본 뒤 cleanup에서 정리한다.
const CUT = "@@LINKCUT@@";

function domainOf(raw: string): string {
  const m = /^(?:https?:\/\/)?(?:www\.)?([^/\s]+)/i.exec(raw.trim());
  return (m?.[1] ?? "").toLowerCase();
}
// ★가장 구체적인 키를 먼저 본다(2026-07-31 실측): 종전엔 사전 순서대로 훑어
//  dart.fss.or.kr이 상위 기관 fss.or.kr에 먼저 걸려 전자공시 링크가 금감원으로 바뀌었다.
//  서브도메인이 독립 서비스인 경우(dart·work24류)를 상위 기관이 삼키면 안 된다.
const WHITELIST_KEYS = Object.keys(VERIFIED_LINKS).sort((a, b) => b.length - a.length);
function whitelistHit(domain: string): { root: string; name: string } | null {
  for (const key of WHITELIST_KEYS) {
    if (domain === key || domain === `www.${key}` || domain.endsWith(`.${key}`)) return VERIFIED_LINKS[key]!;
  }
  return null;
}

/** 본문 URL 정화 — 사전 도메인=루트로 축약(딥 경로 제거), 사전 밖=검색 유도 문구 치환. 치환 수 반환. */
export function sanitizeUrls(html: string, opts?: { allowNaverBlogId?: string | null }): { html: string; replaced: number; fabricated: string[] } {
  // ★자기 블로그 글 주소 허용(실측: 시리즈 전편 링크가 '공식 사이트에서 검색'으로 마스킹됨) —
  //  본인 naver_blog_id의 blog.naver.com 주소만 통과. 남의/지어낸 블로그 주소는 여전히 차단(원 취지 유지).
  const ownBlog = (opts?.allowNaverBlogId ?? "").trim().toLowerCase();
  let replaced = 0;
  const fabricated: string[] = [];
  // ★태그 속성(src/href) 내부는 구조적으로 보호 — 마스킹 후 본문 텍스트 URL만 검사, 마지막에 복원.
  // ★내부링크 마커도 같이 보호(2026-08-04 실측): 마커 URL은 모델이 아니라 코드가 DB(articles.naver_url)에서
  //  넣는다 — 지어낸 주소일 수 없다. 그런데 화면 렌더(formatBody)가 이 함수를 한 번 더 돌리면서,
  //  프로필에 naver_blog_id가 없거나 주소 형태가 화이트리스트 모양(blog.naver.com/{내아이디}/…)과 다르면
  //  주소만 지워졌고, 주소 잃은 마커는 변환 정규식을 못 통과해 대괄호 원문이 독자에게 노출됐다.
  const masks: string[] = [];
  const masked = html
    .replace(/\[(?:마무리)?관련글:[^\]]*\]/g, (m) => { masks.push(m); return `__ATTR${masks.length - 1}__`; })
    .replace(/(src|href)="[^"]*"/gi, (m) => { masks.push(m); return `__ATTR${masks.length - 1}__`; });
  const out0 = masked.replace(URL_RE, (raw, ...rest) => {
    const offset = rest[rest.length - 2] as number; const whole = rest[rest.length - 1] as string;
    const after = whole.slice(offset + raw.length, offset + raw.length + 24);
    void after; // (중복·비문 정리는 아래 cleanup 단계가 문맥을 보고 처리한다)
    if (/supabase\.co|supabase\.in|ateflo\.com/i.test(raw)) return raw;
    if (ownBlog && new RegExp(`^https?://(m\\.)?blog\\.naver\\.com/${ownBlog.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}(/|$)`, "i").test(raw)) return raw; // 내 블로그 글(전편 링크)
    const d = domainOf(raw);
    const hit = whitelistHit(d);
    if (hit) {
      const hasDeepPath = /\/[^\s]{2,}/.test(raw.replace(/^https?:\/\/[^/]+/i, ""));
      if (!hasDeepPath && /^https?:\/\//i.test(raw)) return raw; // 이미 루트면 그대로
      replaced += 1;
      return hit.root; // 딥 경로 → 루트로 축약
    }
    replaced += 1;
    fabricated.push(raw.slice(0, 80));
    return CUT; // ★사전 밖 — 도메인 문자열을 남기지 않는다(아래 cleanup이 문맥에 맞게 치운다)
  });
  // ★지어낸 도메인을 본문에 남기지 않는다(2026-07-31 실측 사고).
  //  종전엔 `${도메인} 공식 사이트에서 검색`으로 바꿔 가짜 주소가 그대로 노출됐다 —
  //  링크만 죽였을 뿐 읽는 사람에겐 여전히 '알려준 주소'였고, 실제로 없는 페이지를 찾아 헤매게 만들었다.
  //  문구 중복·비문도 같이 났다("… 공식 사이트에서 검색 공식 사이트에서 확인하세요").
  const out1 = out0
    .replace(new RegExp(`\\s*[(（]\\s*${CUT}\\s*[)）]`, "g"), "") // 공식 사이트(도메인) → 공식 사이트
    .replace(new RegExp(`${CUT}\\s*(?=,?\\s*(?:의\\s*)?(?:공식\\s*)?(?:사이트|홈페이지|누리집))`, "g"), "") // 뒤에 안내가 이어지면 도메인만 삭제
    .replace(new RegExp(`((?:공식\\s*)?(?:사이트|홈페이지|누리집)\\s*[:：]?\\s*)${CUT}`, "g"), "$1") // 앞에 안내가 있으면 도메인만 삭제
    .replace(new RegExp(`${CUT}\\s*(?=에서)`, "g"), "공식 사이트") // "… 에서 확인하세요" 문장 유지
    .replace(new RegExp(CUT, "g"), "공식 사이트에서 검색") // 남은 것은 검색 유도
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.)])/g, "$1")
    .replace(/([,·])\s*\1/g, "$1");
  const out = out1.replace(/__ATTR(\d+)__/g, (_m, i) => masks[Number(i)] ?? "");
  return { html: out, replaced, fabricated };
}
export function extractUrls(html: string): string[] {
  return [...html.matchAll(URL_RE)].map((m) => m[0]).filter((u) => !/supabase|ateflo\.com/i.test(u));
}
