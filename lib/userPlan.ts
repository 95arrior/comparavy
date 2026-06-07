import type { SupabaseClient } from "@supabase/supabase-js";
import { type PlanKey, planLimits } from "./plans";

export interface UserRow {
  id: string;
  plan: PlanKey;
  articles_limit: number;
  articles_used: number;
  period_start: string;
  billing_key: string | null;
  customer_key: string | null;
  sub_status: string | null;
  next_billing_at: string | null;
  current_period_end: string | null;
}

/** 사용자 행을 가져오고, 없으면 무료 플랜으로 생성한다. */
export async function ensureUserRow(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserRow> {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (data) return data as UserRow;

  const limits = planLimits("free");
  const { data: inserted, error } = await supabase
    .from("users")
    .insert({
      id: userId,
      plan: "free",
      articles_limit: limits.articles_limit,
      articles_used: 0,
      period_start: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return inserted as UserRow;
}

/** 월 사용량 주기를 갱신한다 (period_start로부터 30일 경과 시 사용량 초기화). */
export async function rolloverIfNeeded(
  supabase: SupabaseClient,
  row: UserRow,
): Promise<UserRow> {
  const start = new Date(row.period_start).getTime();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  if (Date.now() - start < THIRTY_DAYS) return row;

  const now = new Date().toISOString();
  await supabase
    .from("users")
    .update({ articles_used: 0, period_start: now })
    .eq("id", row.id);
  return { ...row, articles_used: 0, period_start: now };
}

/** 플랜을 적용한다 (한도 갱신 + 추가 필드). 결제 성공/해지 시 사용. */
export async function applyPlan(
  supabase: SupabaseClient,
  userId: string,
  plan: PlanKey,
  extra: Partial<UserRow> = {},
): Promise<void> {
  const limits = planLimits(plan);
  await supabase
    .from("users")
    .update({ plan, articles_limit: limits.articles_limit, ...extra })
    .eq("id", userId);
}
