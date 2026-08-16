// ★경제 지표 발표 캘린더(2026-08-02 유저 확정: "한 시간도 괜찮아요, 선점하는 거").
//
//  왜 이게 선점의 최상위 재료인가:
//   - 발표 '날짜'가 몇 달 전에 공표된다 → 언제 터질지 100% 안다(공고보다 확실하다)
//   - 발표 순간 검색이 수직 상승한다(기준금리·물가·고용은 전 국민 이해관계)
//   - ★새 숫자라 기존 문서가 0에서 시작한다 — 신생 블로그도 동등하게 출발한다
//   - 매달 반복된다 → 시즌 캘린더처럼 몇 달에 한 번이 아니라 공급이 꾸준하다
//
//  ★날짜는 지어내지 않는다. 아래는 전부 공식 공표 자료에서 확인한 실값이다:
//   - 금통위: 한국은행 통화정책방향 결정회의 일정(연 8회, 2025-10-30 공표)
//   - 물가·고용: 국가데이터처(구 통계청) '2026년 물가, 고용, 산업활동동향 보도계획'
//  ★다음 해 일정은 전년 말에 공표된다 — 2027년치는 그때 확인해서 추가할 것(추정 금지).

export type EconKind = "rate" | "cpi" | "jobs";

export interface EconEvent {
  date: string;   // YYYY-MM-DD (KST) — 발표일
  kind: EconKind;
  label: string;  // 사람이 읽는 이름
  keyword: string; // 검색형 키워드(사람이 실제로 치는 말)
}

// ── 한국은행 금융통화위원회 통화정책방향 결정회의(2026, 8회) ──
//  발표는 통상 오전 — 그날 오전에 '결정 전' 글이 살아 있고, 발표 직후 '해설' 글이 판을 잡는다.
const RATE_2026 = ["2026-01-15", "2026-02-26", "2026-04-10", "2026-05-28", "2026-07-16", "2026-08-27", "2026-10-22", "2026-11-26"];

// ── 소비자물가동향(대상월 → 공표일) ──
const CPI_2026: [string, string][] = [
  ["1월", "2026-02-03"], ["2월", "2026-03-06"], ["3월", "2026-04-02"], ["4월", "2026-05-06"],
  ["5월", "2026-06-02"], ["6월", "2026-07-02"], ["7월", "2026-08-04"], ["8월", "2026-09-02"],
  ["9월", "2026-10-02"], ["10월", "2026-11-03"], ["11월", "2026-12-02"], ["12월·연간", "2026-12-31"],
];

// ── 고용동향(대상월 → 공표일) ──
const JOBS_2026: [string, string][] = [
  ["1월", "2026-02-11"], ["2월", "2026-03-18"], ["3월", "2026-04-15"], ["4월", "2026-05-13"],
  ["5월", "2026-06-11"], ["6월", "2026-07-15"], ["7월", "2026-08-12"], ["8월", "2026-09-09"],
  ["9월", "2026-10-16"], ["10월", "2026-11-11"], ["11월", "2026-12-16"],
];

export const ECON_EVENTS: EconEvent[] = [
  ...RATE_2026.map((date) => ({ date, kind: "rate" as const, label: "한국은행 기준금리 결정(금통위)", keyword: "기준금리" })),
  ...CPI_2026.map(([m, date]) => ({ date, kind: "cpi" as const, label: `${m} 소비자물가동향 발표`, keyword: "소비자물가" })),
  ...JOBS_2026.map(([m, date]) => ({ date, kind: "jobs" as const, label: `${m} 고용동향 발표`, keyword: "고용동향" })),
];

/**
 * ★선점 창 — 발표 이틀 전부터 당일까지만 씨앗으로 넣는다.
 *  더 일찍 넣으면 발표 시점엔 이미 묻히고(신선도 게이트도 6시간이다),
 *  발표 다음 날부터는 이미 남들이 다 쓴 뒤라 선점이 아니다.
 */
export const ECON_LEAD_DAYS = 2;

const dayNumKst = (ymd: string): number => Date.parse(`${ymd}T00:00:00+09:00`);
const todayKstNum = (now: Date): number => {
  const kst = new Date(now.getTime() + 9 * 3600_000);
  return Date.parse(`${kst.toISOString().slice(0, 10)}T00:00:00+09:00`);
};

export interface UpcomingEcon extends EconEvent { dday: number }

/** 다가오는 발표(기본: 선점 창 안). dday 0 = 오늘 발표. */
export function upcomingEcon(now: Date = new Date(), windowDays: number = ECON_LEAD_DAYS): UpcomingEcon[] {
  const t = todayKstNum(now);
  return ECON_EVENTS
    .map((e) => ({ ...e, dday: Math.round((dayNumKst(e.date) - t) / 86400_000) }))
    .filter((e) => e.dday >= 0 && e.dday <= windowDays)
    .sort((a, b) => a.dday - b.dday);
}

/** 지표별 각도 — 발표 전(예고)과 발표일(해설)의 임무가 다르다. */
function angleFor(e: UpcomingEcon): { title: string; brief: string } {
  const 전 = e.dday > 0;
  switch (e.kind) {
    case "rate":
      return 전
        ? { title: "기준금리 결정 앞두고 내 대출 이자는 어떻게 되나", brief: "금통위 발표 전이다. ★결과를 예측하거나 단정하지 마라 — 동결·인상·인하 각 경우에 '내 대출·예금·전세자금에 무슨 일이 생기는지'를 조건별로 정리한다. 발표 후 독자가 자기 경우를 바로 찾을 수 있게." }
        : { title: "기준금리 결정, 그래서 내 통장에 무슨 뜻인가", brief: "오늘 금통위 발표일이다. ★실제 발표된 결과만 쓴다(추측 금지 — 확인 못 했으면 수치를 쓰지 말고 조건별 서술로). 결정 자체보다 '내 대출 이자·예금 금리·이번 달 상환액'으로 번역하는 게 임무다." };
    case "cpi":
      return 전
        ? { title: "물가 발표 앞두고 이번 달 장바구니 점검할 것", brief: "소비자물가동향 발표 전이다. 지수 예측은 하지 마라. 생활에서 체감하는 항목(식료품·공공요금·외식)을 기준으로 '무엇을 확인하면 되는지' 정리한다." }
        : { title: "소비자물가 발표, 내 생활비로 번역하면", brief: "오늘 물가 발표일이다. ★발표된 실제 수치만 쓴다. 상승률 숫자를 나열하지 말고 '월 지출 300만 원 가구면 얼마가 더 나가는지'처럼 금액으로 옮긴다." };
    case "jobs":
      return 전
        ? { title: "고용동향 발표 앞두고 챙길 실업급여·지원금", brief: "고용동향 발표 전이다. 통계 예측 대신 '지금 신청할 수 있는 실업급여·구직 지원금'의 조건과 순서를 정리한다." }
        : { title: "고용동향 발표, 내 업종은 어떻게 됐나", brief: "오늘 고용동향 발표일이다. ★발표된 실제 수치만 쓴다. 전체 취업자 수보다 '연령대·업종별로 어디가 줄고 늘었는지'가 독자에게 쓸모 있다." };
  }
}

/**
 * ★씨앗층 주입용 — 경제 카테고리에만. 뉴스 신선도 게이트 면제(예측 가능한 확정 일정이라 '오늘 기사'가 필요 없다).
 *  seasonalSeeds와 같은 규격으로 돌려준다.
 */
export function econSeeds(category: string, now: Date = new Date()): { keyword: string; title: string; newsContext: string }[] {
  if (!/경제|재테크|금융|투자|부동산/.test(category)) return [];
  return upcomingEcon(now).map((e) => {
    const a = angleFor(e);
    const when = e.dday === 0 ? "오늘" : `${e.dday}일 뒤(${e.date})`;
    return {
      keyword: e.keyword,
      title: a.title,
      newsContext: [
        `[확정 일정 — 선점 글감] ${e.label}이 ${when} 있다.`,
        `이 글의 임무는 발표 시점에 이미 색인돼 있는 것이다 — 발표 후에 쓰면 늦는다.`,
        a.brief,
        `★없는 수치를 지어내지 마라. 확인되지 않은 발표 결과를 단정하면 그 글은 발표 순간 거짓이 된다.`,
      ].join("\n"),
    };
  });
}
