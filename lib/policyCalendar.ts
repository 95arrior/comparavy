// ★고정 캘린더(2026-08-05 유저 확정 — "캘린더 원천부터 붙이는 설계, 1번부터 순서대로").
//
//  왜 이게 1순위인가(6/27·8/4 전수 조사 결과):
//   - 8월 4일 경제 인기유입 20개 중 세제개편안 계열이 4슬롯 — 신호탄은 8/3 세제발전심의위(사전 공표 일정)
//   - 6월 27일 20개 중 월드컵 3슬롯 — 조별리그 최종일, 수개월 전 확정
//   - 6월 27일 삼성 온누리상품권 4슬롯 — 감사 페스티벌 6/8 시작(T-19일에 알 수 있었다)
//   ★두 날 모두 '날짜가 미리 적혀 있던 것'이 상위의 절반 이상이었다.
//
//  ★날짜는 지어내지 않는다(econCalendar와 같은 원칙).
//   - confidence "confirmed" = 법정·공표된 확정 일정
//   - confidence "estimated" = 매년 그 무렵이지만 연도별 확정일이 다른 것 → 브리프에 '일정 확인' 의무를 싣는다
//  ★keywords는 사람이 실제로 치는 원어만 넣는다(합성 금지 원칙과 동일).

export type CalSlot = "tax" | "benefit" | "season" | "weekly" | "policy";

export interface CalEvent {
  date: string;            // YYYY-MM-DD (KST)
  slot: CalSlot;           // 원천 칸 — 화면에서 '이 칸에 글감이 있나'를 보는 단위
  label: string;           // 사람이 읽는 이름
  keywords: string[];      // ★원어 그대로. 첫 번째가 대표 키워드
  lead: number;            // D-N일 전부터 글감으로 띄운다
  confidence: "confirmed" | "estimated";
  brief: string;           // 이 글의 임무(본문 지시)
}

const y = 2026;
const d = (m: number, day: number) => `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

// ── 세금 — 납부·신고 기한은 법으로 정해져 있다(가장 확실한 원천) ──
const TAX: CalEvent[] = [
  { date: d(1, 15), slot: "tax", lead: 14, confidence: "confirmed",
    label: "연말정산 간소화 서비스 개통", keywords: ["연말정산", "연말정산 간소화"],
    brief: "간소화 자료 조회가 열리는 날이다. 무엇을 확인하고 무엇이 자동으로 안 잡히는지(월세·안경·기부금) 순서로 정리한다." },
  { date: d(5, 1), slot: "tax", lead: 14, confidence: "confirmed",
    label: "종합소득세 신고 시작(5/1~5/31)", keywords: ["종합소득세", "종합소득세 신고"],
    brief: "신고 기간 시작이다. 대상자 판별(누가 해야 하나)과 단순경비율·기준경비율 갈림을 먼저 준다." },
  // ★8월 실물(2026-08-05 확인 — 유저: "캘린더가 안 돌아가나요?"에서 드러난 8월 공백을 메운다).
  //  주민세 개인분은 지방세법상 매년 8/16~8/31이 납부기간이다(2026년도 동일함을 확인).
  //  ★납부 시작일을 잡는다 — 마감일에 쓰면 이미 늦다. 검색은 고지서가 도착하는 8월 중순부터 오른다.
  { date: d(8, 16), slot: "tax", lead: 14, confidence: "confirmed",
    label: "주민세 개인분 납부 시작(8/16~8/31)", keywords: ["주민세", "주민세 납부"],
    brief: "고지서가 도착하는 시기다. 누가 대상인지(7/1 기준 세대주)·얼마인지 지자체마다 다르다는 점·안 왔을 때 위택스 조회 순서를 준다. ★금액은 지자체마다 달라 단정하지 마라 — 조회 방법을 주는 게 이 글의 값이다." },
  { date: d(8, 31), slot: "tax", lead: 14, confidence: "confirmed",
    label: "법인세 중간예납 기한(8/31)", keywords: ["법인세 중간예납", "중간예납"],
    brief: "12월 결산 법인의 중간예납 기한이다. 대상 판별과 두 가지 계산 방식(직전 사업연도 기준 vs 가결산) 갈림을 먼저 준다." },
  { date: d(7, 25), slot: "tax", lead: 10, confidence: "confirmed",
    label: "부가가치세 확정신고(1기)", keywords: ["부가세", "부가가치세 신고"],
    brief: "개인 일반과세자 1기 확정신고 기한. 간이과세자와 기한이 다르다는 점을 먼저 가른다." },
  { date: d(7, 16), slot: "tax", lead: 14, confidence: "confirmed",
    label: "재산세 납부(7월분, 16~31일)", keywords: ["재산세", "재산세 납부"],
    brief: "7월분은 주택 1/2과 건축물이다. 9월분과 무엇이 다른지, 카드 납부·분납 조건을 함께 준다." },
  { date: d(9, 16), slot: "tax", lead: 14, confidence: "confirmed",
    label: "재산세 납부(9월분, 16~30일)", keywords: ["재산세", "재산세 9월"],
    brief: "9월분은 토지와 주택 나머지 1/2이다. 7월에 낸 사람이 또 내는 이유를 먼저 설명한다." },
  { date: d(6, 16), slot: "tax", lead: 10, confidence: "confirmed",
    label: "자동차세 납부(1기, 16~30일)", keywords: ["자동차세", "자동차세 납부"],
    brief: "연납 할인을 놓친 사람이 지금 할 수 있는 것과, 카드 무이자·분할 납부를 정리한다." },
  { date: d(12, 16), slot: "tax", lead: 10, confidence: "confirmed",
    label: "자동차세 납부(2기, 16~31일)", keywords: ["자동차세", "자동차세 2기"],
    brief: "2기 납부와 내년 연납 신청(1월) 안내를 한 글에서 잇는다." },
  { date: d(4, 20), slot: "tax", lead: 14, confidence: "estimated",
    label: "건강보험료 연말정산(4월 급여 반영)", keywords: ["건강보험료 정산", "건보료 정산"],
    brief: "4월 급여에서 추가 징수·환급이 갈린다. 왜 사람마다 다른지(전년 보수 변동) 조건으로 가른다. ★정산 반영 시점은 사업장마다 다를 수 있으니 단정하지 않는다." },
];

// ── 지급·환급 — '언제 들어오나'는 매년 같은 시기에 폭발한다 ──
const BENEFIT: CalEvent[] = [
  { date: d(8, 25), slot: "benefit", lead: 14, confidence: "estimated",
    label: "근로장려금 정기 지급(8월 말~9월)", keywords: ["근로장려금", "근로장려금 지급일"],
    brief: "정기 신청분 지급 시기다. 지급일·지급액 조회 방법과 감액 사유를 준다. ★확정 지급일은 국세청 공지로 확인하고, 확인 못 했으면 '조회 방법'으로 쓴다." },
  { date: d(6, 15), slot: "benefit", lead: 14, confidence: "estimated",
    label: "근로장려금 반기 신청(상반기분)", keywords: ["근로장려금 반기", "근로장려금 신청"],
    brief: "반기 신청과 정기 신청의 차이(대상·시기·지급 시점)를 먼저 가른다." },
  { date: d(5, 1), slot: "benefit", lead: 14, confidence: "confirmed",
    label: "근로·자녀장려금 정기 신청(5월)", keywords: ["근로장려금 신청", "자녀장려금"],
    brief: "5월 정기 신청 기간이다. 재산·소득 요건을 가구 유형별로 나눠 준다." },
];

// ── 계절 — 날짜가 아니라 '창'이다. 창이 열리기 전에 써 둔다 ──
const SEASON: CalEvent[] = [
  { date: d(6, 1), slot: "season", lead: 14, confidence: "estimated",
    label: "여름 냉방비 지원·에너지바우처", keywords: ["냉방지원금", "에너지바우처"],
    brief: "여름 냉방비 지원이 열리는 시기다. 대상(에너지바우처·전기요금 복지할인)을 구분하고 신청 경로를 준다. ★지자체마다 별도 지원이 있으니 '내 지역 확인' 안내를 넣는다." },
  { date: d(11, 1), slot: "season", lead: 14, confidence: "estimated",
    label: "겨울 난방비 지원·에너지바우처", keywords: ["난방비 지원", "에너지바우처"],
    brief: "겨울 난방비 지원 시기다. 도시가스 캐시백·등유바우처까지 함께 묶는다." },
  { date: d(11, 15), slot: "season", lead: 14, confidence: "estimated",
    label: "김장 물가·김장비용", keywords: ["김장 비용", "김장 물가"],
    brief: "가구 규모별 예상 비용과 절감 경로(전통시장 온누리·할인지원)를 숫자로 준다." },
  { date: d(7, 1), slot: "season", lead: 14, confidence: "estimated",
    label: "여름휴가비·숙박 할인 지원", keywords: ["숙박세일페스타", "휴가비 지원"],
    brief: "정부·지자체 숙박 할인과 근로자 휴가지원 사업을 신청 순서로 정리한다." },
];

// ── 주간 반복 일정 ──
//  ★로또는 뺐다(2026-08-05 유저 지시). 6/27 실측에서 상위 단골이긴 했으나 유저가 이 축을 닫았다.
//   되살리지 마라 — 검색량만 보고 다시 넣기 쉬운 자리다.

// ── 정책 발표 — 연례 일정. 2026년 실측 확인분 ──
//  ★2026 세제개편안: 8/3 세제발전심의위 확정·발표 → 8/4~20 입법예고 → 8/27 차관회의 → 9/1 국무회의 → 9/3 국회 제출
//   (기획재정부 보도자료로 확인. 이 후속 일정마다 같은 키워드가 다시 폭발한다.)
const POLICY: CalEvent[] = [
  { date: d(8, 27), slot: "policy", lead: 10, confidence: "confirmed",
    label: "2026 세제개편안 차관회의", keywords: ["세제개편안", "부동산 세제개편"],
    brief: "세제개편안이 차관회의를 거치는 날이다. 발표안 대비 무엇이 바뀌었는지, 내 세금에 걸리는 항목만 골라 정리한다. ★확정 전 단계임을 명시한다." },
  { date: d(9, 1), slot: "policy", lead: 10, confidence: "confirmed",
    label: "2026 세제개편안 국무회의", keywords: ["세제개편안", "세법개정안"],
    brief: "국무회의 상정일이다. 시행 시기(언제부터 적용되나)를 항목별로 가르는 게 임무다." },
  { date: d(9, 3), slot: "policy", lead: 10, confidence: "confirmed",
    label: "2026 세제개편안 정기국회 제출", keywords: ["세제개편안", "세법개정안"],
    brief: "국회 제출일이다. 국회 논의에서 바뀔 수 있는 항목과 확정된 항목을 구분해 준다." },
  { date: d(8, 25), slot: "policy", lead: 10, confidence: "estimated",
    label: "2027년도 예산안 발표(8월 말)", keywords: ["예산안", "내년 예산"],
    brief: "예산안에서 '내 돈에 걸리는 것'(지원금·바우처·세액공제)만 골라 정리한다. ★국회 확정 전이라 단정하지 않는다." },
];

export const CAL_EVENTS: CalEvent[] = [...TAX, ...BENEFIT, ...SEASON, ...POLICY];

const dayNumKst = (ymd: string): number => Date.parse(`${ymd}T00:00:00+09:00`);
const todayKstNum = (now: Date): number => {
  const kst = new Date(now.getTime() + 9 * 3600_000);
  return Date.parse(`${kst.toISOString().slice(0, 10)}T00:00:00+09:00`);
};

export interface UpcomingCal extends CalEvent { dday: number }

/**
 * 선행 트리거 — 각 일정의 lead일 전부터 당일까지만 씨앗으로 올린다.
 * ★더 일찍 올리면 발표 때 이미 묻히고(씨앗 수명 6시간), 지난 뒤엔 선점이 아니다.
 */
export function upcomingCal(now: Date = new Date()): UpcomingCal[] {
  const t = todayKstNum(now);
  return [...CAL_EVENTS]
    .map((e) => ({ ...e, dday: Math.round((dayNumKst(e.date) - t) / 86400_000) }))
    .filter((e) => e.dday >= 0 && e.dday <= e.lead)
    .sort((a, b) => a.dday - b.dday);
}

/** 씨앗층 주입용 — 경제 계열 카테고리에만. econSeeds와 같은 규격. */
export function policySeeds(category: string, now: Date = new Date()): { keyword: string; title: string; newsContext: string; slot: CalSlot }[] {
  if (!/경제|재테크|금융|투자|부동산|부업|앱테크/.test(category)) return [];
  return upcomingCal(now).map((e) => {
    const when = e.dday === 0 ? "오늘" : `${e.dday}일 뒤(${e.date})`;
    return {
      keyword: e.keywords[0]!,
      title: `${e.keywords[0]}, 지금 확인해 둘 것`,
      slot: e.slot,
      newsContext: [
        `[확정 일정 — 선점 글감] ${e.label}이 ${when} 있다.`,
        `이 글의 임무는 그날 이미 색인돼 있는 것이다 — 그날 쓰면 늦는다.`,
        e.brief,
        e.confidence === "estimated"
          ? `★이 일정은 해마다 시기가 조금씩 다르다. 확정 날짜를 공식 공지에서 확인하고, 확인 못 했으면 날짜를 단정하지 말고 '확인 방법'으로 쓴다.`
          : `★날짜는 공표된 확정 일정이다. 다만 시행·적용 시점은 별개이니 구분해서 쓴다.`,
        `★관련 검색어(본문 소제목·FAQ로 함께 커버): ${e.keywords.join(", ")}`,
      ].join("\n"),
    };
  });
}
