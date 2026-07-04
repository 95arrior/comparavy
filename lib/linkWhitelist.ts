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
};

// URL 패턴 — http(s) 명시 + 맨몸 도메인(gov.kr/portal… 형태)까지.
export const URL_RE = /https?:\/\/[^\s<>"')\]]+|(?<![\w.@/])(?:[a-z0-9-]+\.)+(?:go\.kr|or\.kr|co\.kr|kr|com|net|org)(?:\/[^\s<>"')\]]*)?/gi;

function domainOf(raw: string): string {
  const m = /^(?:https?:\/\/)?(?:www\.)?([^/\s]+)/i.exec(raw.trim());
  return (m?.[1] ?? "").toLowerCase();
}
function whitelistHit(domain: string): { root: string; name: string } | null {
  for (const [key, v] of Object.entries(VERIFIED_LINKS)) {
    if (domain === key || domain === `www.${key}` || domain.endsWith(`.${key}`)) return v;
  }
  return null;
}

/** 본문 URL 정화 — 사전 도메인=루트로 축약(딥 경로 제거), 사전 밖=검색 유도 문구 치환. 치환 수 반환. */
export function sanitizeUrls(html: string): { html: string; replaced: number; fabricated: string[] } {
  let replaced = 0;
  const fabricated: string[] = [];
  const out = html.replace(URL_RE, (raw) => {
    // 이미지 src 등 태그 속성 내부는 보존(본문 텍스트 URL만) — img src는 http로 시작하며 태그 안: 간단 판별 위해 스토리지 도메인 예외
    if (/supabase\.co|supabase\.in|ateflo\.com/i.test(raw)) return raw;
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
    return `${d} 공식 사이트에서 검색`; // 사전 밖 — 경로 제거 + 검색 유도
  });
  return { html: out, replaced, fabricated };
}
export function extractUrls(html: string): string[] {
  return [...html.matchAll(URL_RE)].map((m) => m[0]).filter((u) => !/supabase|ateflo\.com/i.test(u));
}
