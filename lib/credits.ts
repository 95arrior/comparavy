import { createSupabaseAdminClient } from "./supabase-server";

// 크레딧 서버 헬퍼 — 글 생성 1편 = 1크레딧. (팩 정의·상수는 lib/creditPacks.ts — 클라이언트 공용)
// ★적자 방지: 차감은 생성 '시작 전' 원자적 선차감(spend_credits RPC), 실패 시에만 환불.
//   충전·환불은 (reason, ref) 멱등 — 웹훅 재전송·중복 호출로 이중 지급 불가.

export { GENERATE_COST, CREDIT_PACKS, packByKey, type CreditPack } from "./creditPacks";

/**
 * 원자적 선차감. 성공 시 차감 후 잔액(>=0), 잔액 부족 시 null.
 * 서비스롤 RPC — 클라이언트에서 직접 호출 불가.
 */
export async function spendCredits(userId: string, amount: number, reason: string, ref?: string): Promise<number | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("spend_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_ref: ref ?? null,
  });
  if (error) throw new Error(`크레딧 차감 실패: ${error.message}`);
  const balance = typeof data === "number" ? data : Number(data);
  return balance >= 0 ? balance : null;
}

/**
 * 충전/환불 — (reason, ref) 멱등. 같은 ref로 두 번 불러도 1회만 지급된다.
 * 생성 실패 환불은 반드시 ref를 넘겨 이중 환불을 막는다.
 */
export async function addCredits(userId: string, amount: number, reason: string, ref?: string): Promise<number | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("add_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_ref: ref ?? null,
  });
  if (error) throw new Error(`크레딧 충전 실패: ${error.message}`);
  const balance = typeof data === "number" ? data : Number(data);
  return balance >= 0 ? balance : null;
}
