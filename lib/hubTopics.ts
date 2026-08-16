// ★허브 글감(2026-07-29 전략 회의 — 네이버 유입 검색어 실측).
//  진단: 유입 검색어가 전부 0.6~3%대 롱테일이고, 그 롱테일이 주제별로 뭉쳐 있다
//  (삼성카드 발급 8개 변형 / 채무탕감 6개 / 구직촉진수당 4개…). 꼬리를 여러 개 먹었다는 건
//  그 주제에서 검색엔진이 우리를 후보로 인정했다는 뜻인데, 정작 머리 키워드는 남이 먹고 있다.
//  → 꼬리가 뭉친 주제에 '허브 글' 하나를 세우고 꼬리 글들이 내부링크로 밀어주면 머리로 올라간다.
//  이 파일은 그 판정(어느 주제가 허브를 세울 만큼 뭉쳤나)만 담당한다 — 순수 함수, 테스트 대상.

/** 클러스터 판정에서 제외할 일반 토큰 — 이것만 겹치는 건 같은 주제가 아니다. */
const GENERIC = new Set([
  "방법", "신청", "조건", "기간", "기준", "확인", "정리", "총정리", "지원", "지원금", "대상", "혜택",
  "정부", "얼마", "언제", "어디", "가능", "안내", "종류", "순위", "비교", "추천", "그리고", "하는법",
  "필요", "서류", "이하", "이상", "최대", "최소", "관련", "내용", "경우", "때문", "위해", "무료",
]);

export interface QueryRow { query: string; share?: number }
export interface HubCluster {
  /** 클러스터를 대표하는 핵심 토큰(예: 삼성카드) */
  core: string;
  /** 이 클러스터에 묶인 롱테일 검색어들 */
  queries: string[];
  /** 유입 비중 합(붙여넣은 데이터에 %가 있을 때만, 없으면 0) */
  share: number;
}

/** 네이버 통계에서 복사한 텍스트를 검색어 목록으로 — '검색어 3.13%' / 탭 구분 / 순수 검색어 줄 모두 허용. */
export function parseQueryText(text: string): QueryRow[] {
  const out: QueryRow[] = [];
  for (const raw of String(text || "").split(/[\n\r]+/)) {
    const line = raw.trim();
    if (!line) continue;
    const pct = /(-?\d+(?:\.\d+)?)\s*%/.exec(line);
    const query = line
      .replace(/(-?\d+(?:\.\d+)?)\s*%/g, " ")
      .replace(/^[\d.\s\t·•-]+/, "") // 순위 번호 머리 제거
      .replace(/\s{2,}|\t/g, " ")
      .trim();
    if ([...query].length < 2) continue;
    out.push({ query, share: pct ? Number(pct[1]) : undefined });
  }
  return out;
}

function tokens(q: string): string[] {
  return q
    .replace(/[^가-힣a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => [...t].length >= 2 && !GENERIC.has(t));
}

/**
 * 검색어 목록 → 허브 후보 클러스터.
 * 가장 많이 등장하는 토큰부터 그 토큰을 품은 검색어를 묶고(그리디), minSize 이상만 남긴다.
 * 한 검색어는 한 클러스터에만 속한다(중복 배정 금지 — 같은 글감이 두 번 제안되는 걸 막는다).
 */
export function clusterQueries(rows: QueryRow[], minSize = 3): HubCluster[] {
  const pool = rows.filter((r) => r.query.trim());
  const used = new Set<number>();
  const clusters: HubCluster[] = [];

  for (;;) {
    // 남은 검색어에서 토큰 빈도 집계 — 부분일치(포함)까지 같은 토큰으로 본다('삼성카드' ⊂ '삼성카드발급')
    const freq = new Map<string, number[]>();
    pool.forEach((r, i) => {
      if (used.has(i)) return;
      for (const t of new Set(tokens(r.query))) {
        const arr = freq.get(t) ?? [];
        arr.push(i);
        freq.set(t, arr);
      }
    });
    if (freq.size === 0) break;

    // 포함 관계 병합 — '삼성카드'와 '삼성카드발급'이 따로 세어지지 않게 짧은 토큰 쪽으로 흡수
    for (const [t, idxs] of [...freq.entries()]) {
      for (const [t2, idxs2] of freq.entries()) {
        if (t !== t2 && t2.length > t.length && t2.includes(t)) {
          freq.set(t, [...new Set([...idxs, ...idxs2])]);
        }
      }
    }

    const best = [...freq.entries()].sort((a, b) => b[1].length - a[1].length || a[0].length - b[0].length)[0];
    if (!best || best[1].length < minSize) break;
    const [core, idxs] = best;
    idxs.forEach((i) => used.add(i));
    const queries = idxs.map((i) => pool[i]!.query);
    const share = idxs.reduce((s, i) => s + (pool[i]!.share ?? 0), 0);
    clusters.push({ core, queries, share: Math.round(share * 100) / 100 });
  }

  // 롱테일이 많이 뭉친 순 → 유입 비중 순
  return clusters.sort((a, b) => b.queries.length - a.queries.length || b.share - a.share);
}
