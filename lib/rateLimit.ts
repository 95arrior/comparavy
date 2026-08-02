import type { SupabaseClient } from "@supabase/supabase-js";

// Postgres 기반 간이 rate limiter — 버스트/남용으로 인한 비용 급증 방어.
// (user_id, action)별 고정 윈도우 카운터. MVP 수준의 방어이며, 토큰 변조를
// 통한 우회를 완전히 막으려면 추후 service-role 클라이언트로 강화.
export interface RateLimitResult {
  ok: boolean;
  retryAfterSec?: number;
}

/**
 * ★테스트용 전체 해제 스위치(2026-08-02 유저 요청 — 글감 파이프 수리 중 확인이 막혀서).
 *  ATEFLO_RATE_LIMIT_OFF=1 이면 모든 한도를 통과시킨다.
 *  ★이건 비용 방어 장치다 — 테스트가 끝나면 반드시 되돌린다(환경변수 삭제).
 *   기본값은 항상 '켜짐'이라, 변수를 지우면 저절로 원래대로 돌아온다.
 *  호출마다 끄는 게 아니라 여기 한 곳에서 끈다 — 호출부에 우회 코드를 심으면 지우는 걸 잊는다.
 */
export function rateLimitDisabled(): boolean {
  return process.env.ATEFLO_RATE_LIMIT_OFF === "1";
}

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  if (rateLimitDisabled()) return { ok: true }; // ★테스트 해제 — 환경변수를 지우면 즉시 원복
  const now = Date.now();

  const { data } = await supabase
    .from("rate_limits")
    .select("count, window_start")
    .eq("user_id", userId)
    .eq("action", action)
    .maybeSingle();

  // 첫 요청
  if (!data) {
    await supabase
      .from("rate_limits")
      .insert({ user_id: userId, action, count: 1, window_start: new Date().toISOString() });
    return { ok: true };
  }

  const windowStartMs = new Date(data.window_start).getTime();
  const elapsed = now - windowStartMs;

  // 윈도우 만료 → 리셋
  if (elapsed >= windowSec * 1000) {
    await supabase
      .from("rate_limits")
      .update({ count: 1, window_start: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("action", action);
    return { ok: true };
  }

  // 한도 초과
  if (data.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((windowSec * 1000 - elapsed) / 1000) };
  }

  // 증가
  await supabase
    .from("rate_limits")
    .update({ count: data.count + 1 })
    .eq("user_id", userId)
    .eq("action", action);
  return { ok: true };
}
