// 진단(시뮬레이터) 순수 로직 — 문항/선택지, 유형 매핑, 예상 수익 범위 계산.
// 금액 단위는 '만원'(정수). 모든 결과는 범위로 표기하고, 보장값이 아님을 단서로 명시.

export type QKey = "q1" | "q2" | "q3" | "q4";

export interface QOption {
  id: string;
  label: string;
}
export interface Question {
  key: QKey;
  title: string;
  options: QOption[];
}

export const QUESTIONS: Question[] = [
  {
    key: "q1",
    title: "지금 블로그, 하고 있어요?",
    options: [
      { id: "naver", label: "네이버 블로그" },
      { id: "tistory", label: "티스토리" },
      { id: "wordpress", label: "워드프레스" },
      { id: "none", label: "아직 없어요" },
    ],
  },
  {
    key: "q2",
    title: "블로그로 뭘 하고 싶어요?",
    options: [
      { id: "side", label: "부수입 만들기" },
      { id: "job", label: "본업으로 키우기" },
      { id: "brand", label: "내 브랜드 알리기" },
      { id: "start", label: "일단 시작해보기" },
    ],
  },
  {
    key: "q3",
    title: "글 쓸 시간, 얼마나 돼요?",
    options: [
      { id: "weekend", label: "주말에 잠깐" },
      { id: "daily30", label: "하루 30분" },
      { id: "daily60", label: "매일 1시간 넘게" },
    ],
  },
  {
    key: "q4",
    title: "한 달 방문자, 어느 정도예요?",
    options: [
      { id: "noblog", label: "블로그가 없어요" },
      { id: "almostnone", label: "거의 없어요" },
      { id: "hundreds", label: "수백 명" },
      { id: "thousands", label: "수천 명 이상" },
    ],
  },
];

export type Answers = Partial<Record<QKey, string>>;
export type Range = [number, number]; // [low, high] in 만원

interface TypeDef {
  emoji: string;
  name: string;
  comment: string;
  naver: Range; // 유형별 base 범위(바깥 한계)
  wordpress: Range;
}

// Q2(목표) 기준 유형. 숫자는 보수적 범위(만원/월).
const TYPES: Record<string, TypeDef> = {
  side: { emoji: "🌱", name: "주말 농부형", comment: "느려도 꾸준한 사람이 이겨요", naver: [2, 5], wordpress: [5, 12] },
  job: { emoji: "🔥", name: "전업 도전형", comment: "각오 됐네요. 남은 건 글 쓰는 시간뿐", naver: [5, 15], wordpress: [15, 50] },
  brand: { emoji: "✨", name: "브랜딩형", comment: "수익보다 신뢰가 자산이 돼요", naver: [3, 8], wordpress: [8, 20] },
  start: { emoji: "🐣", name: "입문형", comment: "시작이 반이에요. 작게 시작해요", naver: [1, 3], wordpress: [3, 8] },
};

const FALLBACK_TYPE = "start";

// Q3 시간 · Q4 방문자 → 노력 점수(0~1). 많을수록 범위 윗쪽.
function effortScore(a: Answers): number {
  const q3: Record<string, number> = { weekend: 0, daily30: 0.5, daily60: 1 };
  const q4: Record<string, number> = { noblog: 0, almostnone: 0, hundreds: 0.5, thousands: 1 };
  const t = q3[a.q3 ?? ""] ?? 0;
  const v = q4[a.q4 ?? ""] ?? 0;
  return (t + v) / 2; // 0~1
}

// base 범위 '안에서' 노력 점수만큼 윗쪽으로. 범위를 절대 벗어나지 않음.
function adjust(base: Range, effort: number): Range {
  const [lo, hi] = base;
  const span = hi - lo;
  let low = Math.round(lo + span * 0.4 * effort);
  let high = Math.round(lo + span * (0.5 + 0.5 * effort));
  low = Math.max(lo, Math.min(low, hi));
  high = Math.max(low + 1, Math.min(high, hi));
  return [low, high];
}

export interface DiagnosisResult {
  typeId: string;
  emoji: string;
  name: string;
  comment: string;
  naver: Range;
  wordpress: Range;
  disclaimer: string;
}

export function computeResult(a: Answers): DiagnosisResult {
  const typeId = a.q2 && TYPES[a.q2] ? a.q2 : FALLBACK_TYPE;
  const def = TYPES[typeId];
  const effort = effortScore(a);
  return {
    typeId,
    emoji: def.emoji,
    name: def.name,
    comment: def.comment,
    naver: adjust(def.naver, effort),
    wordpress: adjust(def.wordpress, effort),
    disclaimer: "키워드·꾸준함에 따라 달라져요. 보장값이 아니에요.",
  };
}

/** "2~5만" 형태 라벨(같은 값이면 "5만"). */
export function rangeLabel(r: Range): string {
  return r[0] === r[1] ? `${r[0]}만` : `${r[0]}~${r[1]}만`;
}
