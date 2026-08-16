// ★선점 점수(2026-08-02 유저 확정: "지원금·청약·주식 이슈 — 더 연결해서 선점하는 거").
//
//  배경(실측 사슬):
//   공고 소스(청약홈·보조금24·기업마당)는 **미래 시각**을 들고 온다 — 접수 시작일·마감일이 박혀 있다.
//   검색이 언제 터질지 아는 유일한 재료이고, 화면엔 이미 "접수 D-3 — 지금 발행하면 접수일에 선점돼요"
//   배지까지 있다. 그런데 8/1에 지역 잡음('[경북] 영주시 …')을 막으려고 공고를 억제하면서
//   선점의 원재료도 같이 줄었다.
//
//  ★진단: 문제는 '공고를 막느냐 여느냐'가 아니라 **줄을 안 세운 것**이었다.
//   종전 demandOk는 도착 순서대로 상한(4건)을 채웠다 — 청약홈이 먼저 4건을 채우면
//   그 뒤 보조금24에 아무리 큰 게 있어도 자리가 없다. 가치가 아니라 순서가 결정했다.
//
//  ★그래서 여기서는 '터질 크기 × 터질 시각'으로 점수를 매긴다. 지역명은 보지 않는다 —
//   전국이 검색하는 청약은 지역명이 있어도 살아야 하고, 아무도 안 찾는 지원사업은 지역명이 없어도 죽어야 한다.
//   판정 기준은 오직 실측 검색량과 접수 시각이다.

/** 접수 창 상태 — 화면 문구·정렬 양쪽에서 같은 판정을 쓴다(두 곳에서 계산하면 반드시 드리프트한다). */
export type PreemptWindow = "early" | "prime" | "today" | "open" | "closing" | "passed";

export interface PreemptInput {
  /** 실측 월 검색량(topicDemand). 못 잰 경우 null — 호출측이 이미 걸렀어야 한다. */
  monthly: number | null;
  /** 접수 시작 YYYY-MM-DD (KST). 없으면 시각 점수 0. */
  actionStart?: string | null;
  /** 접수 마감 YYYY-MM-DD (KST). */
  actionEnd?: string | null;
  now?: Date;
}

const dayNumKst = (ymd: string): number => Date.parse(`${ymd}T00:00:00+09:00`);
const todayKstNum = (now: Date): number => {
  const kst = new Date(now.getTime() + 9 * 3600_000);
  return Date.parse(`${kst.toISOString().slice(0, 10)}T00:00:00+09:00`);
};

/** 접수 창 판정. actionStart가 없으면 상시형으로 보고 "open". */
export function preemptWindow(input: PreemptInput): PreemptWindow {
  const now = input.now ?? new Date();
  const t = todayKstNum(now);
  const start = input.actionStart ? dayNumKst(input.actionStart) : null;
  const end = input.actionEnd ? dayNumKst(input.actionEnd) : null;
  if (end !== null && end < t) return "passed"; // 마감 지남 — 죽은 글감
  if (start === null) return "open";
  const ds = Math.round((start - t) / 86400_000);
  if (ds > 21) return "early";   // 너무 이르다 — 캘린더 선행 트랙의 몫이지 '지금 뜨는'이 아니다
  if (ds >= 1) return ds <= 7 ? "prime" : "early";
  if (ds === 0) return "today";
  // 접수 중 — 마감이 코앞이면 마감 훅이 산다
  if (end !== null) {
    const de = Math.round((end - t) / 86400_000);
    if (de <= 2) return "closing";
  }
  return "open";
}

/**
 * 시각 점수 — '아직 아무도 안 썼고, 곧 터진다'가 최고점이다.
 * ★prime(D-1~7)이 최고인 이유: 접수가 시작되면 경쟁 글이 쏟아진다. 그 전에 색인돼 있어야 선점이다.
 * ★early(D-21+)를 낮게 두는 이유: 너무 이르면 색인은 되어도 폭발 시점엔 밀린다 — 그건 캘린더 트랙이 따로 맡는다.
 */
export function timingScore(w: PreemptWindow): number {
  switch (w) {
    case "prime": return 10;
    case "today": return 8;
    case "closing": return 6;
    case "open": return 4;
    case "early": return 2;
    case "passed": return -100;
  }
}

/** 수요 점수 — 실측 월 검색량. 못 쟀거나 바닥이면 후보에서 뺀다(추정으로 통과시키지 않는다). */
export function demandScore(monthly: number | null): number {
  if (monthly == null) return -100;
  if (monthly >= 10_000) return 10;
  if (monthly >= 3_000) return 8;
  if (monthly >= 1_000) return 6;
  if (monthly >= 300) return 4;
  if (monthly >= 100) return 2;
  return -100;
}

/** 선점 점수 = 터질 크기 + 터질 시각. 음수면 후보 자격 없음. */
export function preemptionScore(input: PreemptInput): number {
  const d = demandScore(input.monthly);
  if (d < 0) return d;
  const t = timingScore(preemptWindow(input));
  if (t < 0) return t;
  return d + t;
}

/** 로그·진단용 한 줄 — 왜 이 점수인지 사람이 읽게. */
export function preemptionNote(input: PreemptInput): string {
  const w = preemptWindow(input);
  const m = input.monthly == null ? "측정불가" : `월 ${input.monthly.toLocaleString()}회`;
  return `${m} · ${w}(${timingScore(w)}) = ${preemptionScore(input)}`;
}
