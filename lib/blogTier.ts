// ★블로그 지수 단계(FF_TIER_BANDS §2-1) — 시간이 아니라 실측 성과(D+7 상위노출) 기준.
//  성과 데이터가 없으면 판정 불가 = null → 호출측은 기존 밴드 그대로(절대 임의로 낮추지 않는다).
//  강등은 보수적: 승급선을 TIER_DEMOTE_MARGIN 이상 크게 밑돌 때만 한 단계씩.
import type { SupabaseClient } from "@supabase/supabase-js";
import { RANK_WIN, TIER_PROMOTE, TIER_DEMOTE_MARGIN } from "./scoreWeights";

const RANK_WIN_DAYS = 7; // 판정 재료인 D+7 스냅샷이 존재할 수 있는 최소 경과일

export type BlogTier = "SEEDLING" | "GROWING" | "ESTABLISHED";

export interface TierResult {
  tier: BlogTier;
  wins: number;      // 최근 10건 중 D+7 상위노출
  sample: number;    // 판정에 쓴 발행 수(D+7 스냅샷 보유분)
  note: string;      // 카드 안내 한 줄(보장 표현·이모지 금지)
}

const NOTES: Record<BlogTier, string> = {
  SEEDLING: "지금은 확실히 이길 수 있는 키워드부터 쌓는 단계예요. 상위노출이 쌓이면 더 큰 키워드가 열립니다.",
  GROWING: "상위노출 이력이 쌓이기 시작했어요. 조금 더 큰 키워드에 도전하는 단계예요.",
  ESTABLISHED: "검증된 블로그 단계예요. 수요가 큰 키워드까지 넓게 노리는 단계입니다.",
};

/** ★콜드스타트(2026-07-15 유저 확정: 밴드 사다리 — 신생기는 '시작값'이지 판정 불가가 아니다).
 *  순위 데이터가 아직 없으면 SEEDLING에서 시작 — 스냅샷이 쌓이면 computeBlogTier가 승급으로 덮어쓴다. */
export function coldStartTier(): TierResult {
  return { tier: "SEEDLING", wins: 0, sample: 0, note: NOTES.SEEDLING };
}

/** 성과 데이터 기반 tier — 데이터 부족 시 null(호출측이 콜드스타트 시작값 적용). api_cache 24h는 호출측에서. */
export async function computeBlogTier(db: SupabaseClient, userId: string, blogId: string | null): Promise<TierResult | null> {
  try {
    // ★창 수리(2026-07-29 계측으로 검거): 종전엔 '최근 10건'을 그대로 봤다.
    //  하루 2편 발행이면 최근 10건 = 최근 5일치인데, 판정 재료는 D+7 스냅샷이다.
    //  → 교집합이 구조적으로 항상 비어 sample=0 → null → 영원히 SEEDLING(트렌드 7:3 고정).
    //  실측: rank_snapshots D+7이 80건이나 쌓여 있는데도 tier 판정 캐시가 없었다(재료는 있는데 창이 어긋난 것).
    //  → 'D+7이 지난 글' 중에서 최근 10건을 본다.
    const dPlus7 = new Date(Date.now() - RANK_WIN_DAYS * 86400_000).toISOString();
    let q = db.from("post_performance").select("article_id, vol, published_at").eq("user_id", userId)
      .lte("published_at", dPlus7)
      .order("published_at", { ascending: false }).limit(10);
    if (blogId) q = q.eq("blog_id", blogId);
    const { data: posts } = await q;
    if (!posts?.length) return null; // 성과 루프 미가동/데이터 없음 — 판정 불가(§2-1)
    const ids = posts.map((p) => String(p.article_id));
    const { data: snaps } = await db.from("rank_snapshots").select("article_id, rank, status").eq("day_offset", 7).eq("area", "blog_tab").in("article_id", ids);
    const byId = new Map((snaps ?? []).map((s) => [String(s.article_id), s]));
    let wins = 0, sample = 0, bigWins = 0;
    for (const p of posts) {
      const s = byId.get(String(p.article_id));
      if (!s || s.status === "unknown") continue; // 스냅샷 없는/불명 글은 표본 제외
      sample += 1;
      const win = s.rank != null && s.rank <= RANK_WIN.blogTabTop;
      if (win) {
        wins += 1;
        if (typeof p.vol === "number" && p.vol >= TIER_PROMOTE.ESTABLISHED_BIGWIN.vol) bigWins += 1;
      }
    }
    if (sample === 0) return null;
    let tier: BlogTier = "SEEDLING";
    if (wins >= TIER_PROMOTE.ESTABLISHED || bigWins >= TIER_PROMOTE.ESTABLISHED_BIGWIN.wins) tier = "ESTABLISHED";
    else if (wins >= TIER_PROMOTE.GROWING) tier = "GROWING";
    // 강등 보수 규칙: 상위 tier 판정 이력이 있어도 여기서는 재계산값만 반환하되,
    // 호출측 캐시가 직전 tier를 주면 큰 폭 미달일 때만 한 단계 내린다.
    return { tier, wins, sample, note: NOTES[tier] };
  } catch (e) {
    console.error("[tier] 판정 실패 — 기존 밴드 유지:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** 직전 tier 대비 보수적 강등 — 한 번에 한 단계, 크게 밑돌 때만(§2-1). */
export function applyDemoteGuard(prev: BlogTier | null, next: TierResult): TierResult {
  if (!prev) return next;
  const order: BlogTier[] = ["SEEDLING", "GROWING", "ESTABLISHED"];
  const pi = order.indexOf(prev), ni = order.indexOf(next.tier);
  if (ni >= pi) return next; // 유지·승급은 그대로
  // 강등 요구 조건: 현 tier 승급선보다 TIER_DEMOTE_MARGIN 이상 부족할 때만, 한 단계만
  const line = prev === "ESTABLISHED" ? TIER_PROMOTE.ESTABLISHED : TIER_PROMOTE.GROWING;
  if (next.wins <= Math.max(0, line - TIER_DEMOTE_MARGIN)) {
    const stepped = order[Math.max(0, pi - 1)]!;
    return { ...next, tier: stepped, note: NOTES[stepped] };
  }
  return { ...next, tier: prev, note: NOTES[prev] };
}
