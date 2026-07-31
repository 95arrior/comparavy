// ★주제 수요 실측(2026-08-01 유저 우선순위: "홈판이랑 뜨는 것만 진짜 수요가 높으면 된다").
//
//  왜 필요했나(실측):
//   '지금 뜨는' 열 5장이 전부 월 0~70회로 나왔다. 그런데 재보니 측정 방법이 틀린 거였다.
//     '7월 전기요금 환급'      → 0회      /  '전기요금'      → 66,020회
//     '월급날 통장 잔고'       → 0회      /  '월급날'        → 3,280회
//     '청년 창업 지원금 받는 방법' → 70회  /  '청년창업지원금' → 11,740회
//     '국가배상금 수령방법'     → 10회     /  '국가배상금'     → 70회   ← 이건 진짜 수요 없음
//   즉 긴 앵커를 그대로 재면 전부 0이 된다. 검색량은 '사람이 실제로 치는 말'에만 붙는다.
//
//  이 파일은 앵커에서 '사람이 칠 법한 말'을 만들어 재고, 그중 최대치를 주제 수요로 본다.
//  ★추정하지 않는다 — 전부 네이버 광고 API 실측이고, 못 재면 null이다.

import { fetchKeywordStats } from "./naverKeyword";

/** 앞에 붙어 수요를 0으로 만드는 수식어 — 시점·정도·지시. 실측에서 관찰된 것만 넣는다. */
const MODIFIER_RE = /^(\d{1,2}월|올해|내년|작년|이번\s*달|이번\s*주|오늘|지금|요즘|최근|폭염|한파|장마|긴급|신규|추가)\s*/;
/** 뒤에 붙는 행위 꼬리 — '~받는 방법'류는 검색어가 아니라 문장이다. */
const TAIL_RE = /\s*(받는\s*방법|받는\s*법|신청\s*방법|수령\s*방법|하는\s*방법|확인\s*방법|알아보기|총정리|정리|방법|법)$/;

/** 앵커 → 사람이 실제로 칠 법한 후보들(중복 제거, 최대 6개). 긴 것부터 짧은 것 순. */
export function demandCandidates(anchor: string): string[] {
  const base = anchor.trim().replace(/[?!.,·]/g, " ").replace(/\s+/g, " ").trim();
  if (!base) return [];
  const out: string[] = [];
  const push = (s: string) => {
    const v = s.trim();
    if (v.length >= 2 && !out.includes(v)) out.push(v);
  };

  const stripped = base.replace(MODIFIER_RE, "").replace(TAIL_RE, "").trim();
  push(stripped);
  push(stripped.replace(/\s+/g, "")); // 붙여쓰기 — 네이버는 붙여쓴 형태가 본체인 경우가 많다

  const toks = stripped.split(" ").filter(Boolean);
  // 뒤쪽 어절 조합(핵심 명사는 뒤에 오는 경우가 많다): 마지막 2어절, 마지막 1어절
  if (toks.length >= 2) {
    push(toks.slice(-2).join(" "));
    push(toks.slice(-2).join(""));
  }
  if (toks.length >= 1) push(toks[toks.length - 1]!);
  // 앞 2어절도 본다(브랜드·제도명이 앞에 오는 경우)
  if (toks.length >= 2) push(toks.slice(0, 2).join(""));

  return out.slice(0, 6);
}

export interface TopicDemand {
  /** 그 주제로 실제 검색되는 최대 월 검색량. */
  monthly: number;
  /** 그 수치가 나온 말(카드에 근거로 보여준다). */
  via: string;
  /** 앵커 그대로 잰 값(참고 — 보통 0이다). */
  anchorMonthly: number | null;
}

/**
 * 앵커의 주제 수요를 실측한다. 못 재면 null(추정 금지).
 * ★여러 후보를 한 번에 조회하고 최대치를 쓴다 — '이 주제에 관심이 있느냐'를 보는 것이지
 *  이 문구로 상위노출을 노리는 게 아니다(홈판은 검색 게임이 아니다).
 */
export async function measureTopicDemand(anchor: string): Promise<TopicDemand | null> {
  const cands = demandCandidates(anchor);
  if (!cands.length) return null;
  try {
    const stats = await fetchKeywordStats(cands);
    let best: TopicDemand | null = null;
    let anchorMonthly: number | null = null;
    for (const c of cands) {
      const st = stats.get(c.replace(/\s+/g, "").toLowerCase()) ?? stats.get(c);
      if (!st) continue;
      const m = st.mobile + st.pc;
      if (c === cands[0]) anchorMonthly = m;
      if (!best || m > best.monthly) best = { monthly: m, via: c, anchorMonthly };
    }
    return best ? { ...best, anchorMonthly } : null;
  } catch {
    return null;
  }
}

/**
 * ★수요 하한(2026-08-01 실측으로 잡은 선).
 *  통과해야 하는 쪽: 전기요금 66,020 · 청년창업지원금 11,740 · 월급날 3,280 · 전기요금환급 590
 *  걸러야 하는 쪽:   국가배상금 70
 *  그 사이에서 보수적으로 500을 잡는다 — 590이 통과선 바로 위라 더 올리면 멀쩡한 주제가 잘린다.
 *  이 숫자는 관측이 쌓이면 다시 본다. 지금은 '관측된 통과/탈락 사이에 그은 선'이라는 뜻이다.
 */
export const TOPIC_DEMAND_MIN = 500;

export function hasRealDemand(d: TopicDemand | null): boolean {
  return d != null && d.monthly >= TOPIC_DEMAND_MIN;
}

/** 카드에 붙일 근거 문장 — 주장 대신 숫자를 보여준다. */
export function demandNote(d: TopicDemand | null): string | null {
  if (!d) return null;
  return `'${d.via}' 월 ${d.monthly.toLocaleString()}회 검색`;
}
