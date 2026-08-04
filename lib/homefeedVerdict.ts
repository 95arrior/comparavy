// ★홈판 베팅 판정기(2026-08-01) — 40%를 걸었으면 틀렸을 때 알아야 한다.
//  배경: 유저 확정으로 신생 배합의 40%를 홈판에 걸었다. 그런데 홈판은 '터지면 상한 없고 안 터지면 0'인
//  휘발성 레인이고, 우리는 홈판이 터지는 걸 아직 한 번도 관측한 적이 없다. 검증 수단 없이 40%를 거는 것은
//  베팅이 아니라 도박이다 — 그래서 되돌릴 근거를 만든다.
//
//  ★측정의 한계를 먼저 못 박는다(이게 없으면 숫자를 과신한다):
//   - 네이버 글별 조회수는 우리 DB에 없다. 가진 건 checkins(유저가 손으로 넣는 '일 단위' 총 방문자)뿐이다.
//   - 따라서 이건 '어느 글이 터졌나'가 아니라 '홈판을 밀어 넣은 기간에 방문자가 움직였나'를 본다.
//   - 인과가 아니라 상관이다. 반증(안 움직였다)에는 충분하고, 입증(움직였다=홈판 덕분)에는 부족하다.
//     그 비대칭을 그대로 판정에 반영한다 — 좋은 신호는 '유망'까지만, 나쁜 신호는 '되돌려라'까지 간다.

import { SPIKE_RATIO, SPIKE_MIN_VISITORS } from "./scoreWeights";

export interface DayPoint {
  day: string;       // YYYY-MM-DD (KST)
  visitors: number;
}

export interface HomefeedInput {
  /** 일자별 방문자(checkins) — 오름차순 정렬 여부 무관. */
  days: DayPoint[];
  /** 홈판 종족으로 발행된 글의 발행일(KST YYYY-MM-DD) 목록. 같은 날 여러 편이면 중복 포함. */
  homefeedPublishDays: string[];
  /** 홈판이 아닌 글의 발행일 — 대조군. */
  otherPublishDays: string[];
  /**
   * ★익은 홈판 글 수(2026-08-04 유저 관찰로 추가) — 발행 후 RIPE_DAYS 이상 지난 것.
   *  유저 실측: "지금 홈판에 노출되는 건 홈판 전략 전에 쓴 옛 글이고, 지금 글들은 아직 노출이 안 됐다."
   *  홈피드 추천은 반응 데이터가 쌓인 뒤에 붙는 것으로 보인다 — 그렇다면 갓 낸 글로 '안 터졌다'고
   *  판정하는 건 오판이다. 되돌리라는 결론은 익은 표본 위에서만 낸다.
   *  미제공이면 종전 동작 유지(하위호환).
   */
  ripeHomefeedPosts?: number;
}

export type Verdict = "insufficient" | "revert" | "hold" | "promising";

export interface HomefeedVerdict {
  verdict: Verdict;
  headline: string;
  /** 관측 일수(방문자 데이터가 있는 날). */
  observedDays: number;
  homefeedPosts: number;
  /** 급등일(최근 평균 대비 SPIKE_RATIO배 & 절대 하한 이상) 목록. */
  spikes: { day: string; visitors: number; baseline: number; homefeedPostsNearby: number }[];
  /** 급등일 중 직전 3일 안에 홈판 글이 있던 비율(0~1). 표본이 없으면 null. */
  spikeAttribution: number | null;
  bestDay: DayPoint | null;
  medianVisitors: number | null;
  notes: string[];
}

const ATTRIB_WINDOW_DAYS = 3; // 홈판 노출은 발행 당일~며칠 사이에 붙는다(그 밖은 귀속하지 않는다)
const MIN_DAYS = 10;          // 이보다 적으면 판정하지 않는다 — 소표본으로 40% 배합을 뒤집으면 안 된다
const MIN_POSTS = 8;          // 홈판 글이 이만큼은 나가 봐야 '안 터진다'고 말할 수 있다
export const RIPE_DAYS = 7;   // 홈판 글이 '익었다'고 보는 최소 경과일(홈피드 순환은 즉시가 아니다)
const MIN_RIPE = 5;           // 익은 글이 이만큼은 돼야 되돌림을 논한다

const dayNum = (d: string): number => Date.parse(`${d}T00:00:00Z`);

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : Math.round((s[m - 1]! + s[m]!) / 2);
}

/**
 * 홈판 베팅이 일하고 있는지 판정한다. 순수 함수 — DB를 모른다(테스트 가능하게).
 */
export function judgeHomefeed(input: HomefeedInput): HomefeedVerdict {
  const days = [...input.days].filter((d) => Number.isFinite(d.visitors)).sort((a, b) => dayNum(a.day) - dayNum(b.day));
  const hfDays = [...input.homefeedPublishDays].sort();
  const notes: string[] = [];

  const observedDays = days.length;
  const homefeedPosts = hfDays.length;

  // 급등 판정 — 직전 7일 평균 대비. 앞 7일이 없는 구간은 판정에서 뺀다(기준선이 없으면 급등도 없다).
  const spikes: HomefeedVerdict["spikes"] = [];
  for (let i = 0; i < days.length; i++) {
    const prev = days.slice(Math.max(0, i - 7), i);
    if (prev.length < 4) continue; // 기준선 표본 부족
    const baseline = prev.reduce((s, d) => s + d.visitors, 0) / prev.length;
    const cur = days[i]!;
    if (baseline <= 0) continue;
    if (cur.visitors >= SPIKE_MIN_VISITORS && cur.visitors >= baseline * SPIKE_RATIO) {
      const lo = dayNum(cur.day) - ATTRIB_WINDOW_DAYS * 86400_000;
      const nearby = hfDays.filter((d) => { const t = dayNum(d); return t <= dayNum(cur.day) && t >= lo; }).length;
      spikes.push({ day: cur.day, visitors: cur.visitors, baseline: Math.round(baseline), homefeedPostsNearby: nearby });
    }
  }

  const spikeAttribution = spikes.length ? spikes.filter((s) => s.homefeedPostsNearby > 0).length / spikes.length : null;
  const bestDay = days.length ? days.reduce((a, b) => (b.visitors > a.visitors ? b : a)) : null;
  const medianVisitors = median(days.map((d) => d.visitors));

  // ── 판정 ────────────────────────────────────────────────────────────────
  if (observedDays < MIN_DAYS || homefeedPosts < MIN_POSTS) {
    notes.push(`관측 ${observedDays}일 · 홈판 ${homefeedPosts}편 — 판정 최소선(${MIN_DAYS}일 / ${MIN_POSTS}편) 미달.`);
    notes.push("이 구간에서는 어떤 결론도 내지 않는다. 소표본으로 배합을 뒤집으면 그게 더 큰 손해다.");
    return { verdict: "insufficient", headline: "아직 판정할 수 없어요 — 표본이 부족합니다", observedDays, homefeedPosts, spikes, spikeAttribution, bestDay, medianVisitors, notes };
  }

  // ★익음 게이트 — 표본 수는 찼는데 그 글들이 아직 안 익었으면 판정하지 않는다.
  const ripe = input.ripeHomefeedPosts ?? homefeedPosts;
  if (ripe < MIN_RIPE) {
    notes.push(`홈판 ${homefeedPosts}편 중 발행 ${RIPE_DAYS}일이 지난 것은 ${ripe}편입니다(최소 ${MIN_RIPE}편 필요).`);
    notes.push("홈피드 노출은 발행 즉시가 아니라 반응이 쌓인 뒤에 붙습니다 — 갓 낸 글로 '안 터졌다'고 판정하면 오판입니다.");
    notes.push("지금 홈피드에서 들어오는 유입이 있다면 그건 이전 글들의 몫일 수 있습니다. 두 시기를 섞어 보지 마세요.");
    return { verdict: "insufficient", headline: "아직 판정할 수 없어요 — 홈판 글이 덜 익었습니다", observedDays, homefeedPosts, spikes, spikeAttribution, bestDay, medianVisitors, notes };
  }

  if (spikes.length === 0) {
    notes.push(`홈판 ${homefeedPosts}편을 내보내는 동안 방문자 급등이 한 번도 없었습니다.`);
    notes.push("홈판은 '터지거나 0'인 레인이라, 이 표본에서 한 번도 안 터졌다면 배합을 되돌리는 편이 낫습니다.");
    notes.push("되돌리기: lib/scoreWeights.ts의 TIER_LANE_MIX.SEEDLING에서 homefeed 비중을 낮추고 golden으로 옮깁니다.");
    return { verdict: "revert", headline: "홈판이 일하지 않고 있어요 — 배합을 되돌리는 걸 권합니다", observedDays, homefeedPosts, spikes, spikeAttribution, bestDay, medianVisitors, notes };
  }

  if (spikeAttribution !== null && spikeAttribution >= 0.5) {
    notes.push(`급등 ${spikes.length}회 중 ${Math.round(spikeAttribution * 100)}%가 홈판 발행 ${ATTRIB_WINDOW_DAYS}일 안에 있었습니다.`);
    notes.push("★상관이지 인과가 아닙니다 — 같은 기간의 시의성·요일 효과일 수 있습니다. 비중을 더 올리기 전에 한 사이클 더 봅니다.");
    return { verdict: "promising", headline: "홈판이 일하는 신호가 보입니다 (아직 인과는 아님)", observedDays, homefeedPosts, spikes, spikeAttribution, bestDay, medianVisitors, notes };
  }

  notes.push(`급등은 ${spikes.length}회 있었지만 홈판 발행과 겹친 비율이 ${spikeAttribution === null ? "판정 불가" : `${Math.round(spikeAttribution * 100)}%`}입니다.`);
  notes.push("급등의 출처가 홈판이 아닐 가능성이 큽니다 — 배합을 올리지 말고 유지하며 한 사이클 더 봅니다.");
  return { verdict: "hold", headline: "급등은 있으나 홈판 몫이라 보기 어렵습니다 — 유지", observedDays, homefeedPosts, spikes, spikeAttribution, bestDay, medianVisitors, notes };
}
