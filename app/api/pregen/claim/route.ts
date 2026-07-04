import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { spendCredits, addCredits, GENERATE_COST } from "@/lib/credits";
import { logUsage } from "@/lib/usageLog";

// ★열람 = 차감(claim) — 사전 생성분을 여는 순간에만 크레딧 차감. 이중 차감 불가:
//  ①이미 draft(중복 claim·다른 탭)면 차감 없이 그대로 반환 ②차감 후 조건부 전환 실패(레이스)면 멱등 환불.
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = typeof body.articleId === "string" ? body.articleId.slice(0, 60) : "";
  if (!id) return NextResponse.json({ error: "bad" }, { status: 400 });

  const { data: row } = await supabase.from("articles").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!row) return NextResponse.json({ error: "글을 찾을 수 없어요." }, { status: 404 });
  if (row.status === "draft" || row.status === "published") {
    return NextResponse.json({ ok: true, article: row, alreadyClaimed: true }); // 중복 claim — 차감 0
  }
  if (row.status !== "pre_generated") return NextResponse.json({ error: "아직 준비 중이에요.", code: "NOT_READY" }, { status: 409 });

  const balance = await spendCredits(user.id, GENERATE_COST, "generate");
  if (balance === null) return NextResponse.json({ error: "크레딧이 부족해요.", code: "NO_CREDITS" }, { status: 402 });

  const { data: updated } = await supabase.from("articles").update({ status: "draft" })
    .eq("id", id).eq("user_id", user.id).eq("status", "pre_generated").select("*").maybeSingle();
  if (!updated) {
    // 레이스(다른 탭이 먼저 전환) — 멱등 환불(articleId를 ref로: 같은 사고 재시도에도 1회만)
    await addCredits(user.id, GENERATE_COST, "refund_claim", `claim-${id}`).catch(() => null);
    const { data: cur } = await supabase.from("articles").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
    return NextResponse.json({ ok: true, article: cur, alreadyClaimed: true });
  }
  void logUsage({ userId: user.id, model: "pregen", kind: "pregen_hit", inputTokens: 0, outputTokens: 0 });
  return NextResponse.json({ ok: true, article: updated, credits: balance });
}
