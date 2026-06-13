import { createSupabaseAdminClient } from "./supabase-server";

// 모델별 가격 (USD per 1M tokens)
const PRICE: Record<string, { in: number; out: number }> = {
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
  "claude-opus-4-8": { in: 5, out: 25 },
};
// 환율(대략). 정밀 비용은 Anthropic 콘솔 기준, 여기선 운영 모니터링용.
export const USD_TO_KRW = 1400;

export function costKrw(model: string, inTok: number, outTok: number): number {
  const p = PRICE[model] ?? PRICE["claude-sonnet-4-6"];
  const usd = (inTok * p.in + outTok * p.out) / 1_000_000;
  return usd * USD_TO_KRW;
}

/** Anthropic 호출 실제 토큰을 기록한다 (best-effort — 실패해도 기능에 영향 없음). */
export async function logUsage(args: {
  userId?: string | null;
  model: string;
  kind: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
}): Promise<void> {
  try {
    await createSupabaseAdminClient().from("usage_log").insert({
      user_id: args.userId ?? null,
      model: args.model,
      kind: args.kind,
      input_tokens: args.inputTokens ?? 0,
      output_tokens: args.outputTokens ?? 0,
    });
  } catch {
    // 무시
  }
}
