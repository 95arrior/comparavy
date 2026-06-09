import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { type PlanKey, planLimits } from "./plans";
import { createSupabaseAdminClient } from "./supabase-server";

/** 이메일을 단방향 해시로 — 탈퇴 이력 대조용(평문 미저장) */
export function emailHash(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

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
  /** 무료 미리보기(티저)를 이미 만들었는지 — 삭제·만료돼도 유지(재생성 차단) */
  teaser_used?: boolean;
}

/** 사용자 행을 가져오고, 없으면 무료 플랜으로 생성한다. */
export async function ensureUserRow(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null,
): Promise<UserRow> {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (data) return data as UserRow;

  // 신규 가입 — 과거 탈퇴 이력이 있으면 무료 미제공(무료는 이메일당 평생 1회)
  let freeLimit = planLimits("free").articles_limit;
  let priorAccount = false;
  if (email) {
    try {
      const admin = createSupabaseAdminClient();
      const { data: prior } = await admin
        .from("deleted_accounts")
        .select("email_hash")
        .eq("email_hash", emailHash(email))
        .maybeSingle();
      if (prior) {
        freeLimit = 0;
        priorAccount = true;
      }
    } catch {
      // deleted_accounts 테이블이 없거나 조회 실패 시 기본값(무료 제공) 유지
    }
  }

  const insertData: Record<string, unknown> = {
    id: userId,
    plan: "free",
    articles_limit: freeLimit,
    articles_used: 0,
    period_start: new Date().toISOString(),
  };
  // 재가입자는 티저(미리보기)도 막아 추가 모델 호출(비용)까지 차단
  if (priorAccount) insertData.teaser_used = true;

  const { data: inserted, error } = await supabase
    .from("users")
    .insert(insertData)
    .select("*")
    .single();

  if (error) throw error;
  return inserted as UserRow;
}

/** 월 사용량 주기를 갱신한다 (period_start로부터 30일 경과 시 사용량 초기화). */
export async function rolloverIfNeeded(row: UserRow): Promise<UserRow> {
  // 무료는 평생 3편(리셋 없음). 유료 구독만 매 결제주기마다 사용량을 리셋한다.
  if (row.plan === "free") return row;
  const start = new Date(row.period_start).getTime();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  if (Date.now() - start < THIRTY_DAYS) return row;

  const now = new Date().toISOString();
  // 쓰기는 서비스롤로 — 유저 권한(RLS)으로 users update가 막히던 문제 방지
  await createSupabaseAdminClient()
    .from("users")
    .update({ articles_used: 0, period_start: now })
    .eq("id", row.id);
  return { ...row, articles_used: 0, period_start: now };
}

/** 플랜을 적용한다 (한도 갱신 + 추가 필드). 결제 성공/해지 시 사용. */
export async function applyPlan(
  userId: string,
  plan: PlanKey,
  extra: Partial<UserRow> = {},
): Promise<void> {
  // 쓰기는 서비스롤로 — 유저 권한(RLS)으로 users update가 막히던 문제 방지
  const admin = createSupabaseAdminClient();
  const limits = planLimits(plan);
  await admin
    .from("users")
    .update({ plan, articles_limit: limits.articles_limit, ...extra })
    .eq("id", userId);

  // 유료 전환 시 무료 미리보기(티저) 잠금 해제 → 결제 직후 바로 전체 글 열람·발행 가능
  if (plan !== "free") {
    await admin
      .from("articles")
      .update({ locked: false })
      .eq("user_id", userId)
      .eq("locked", true);
  }
}
