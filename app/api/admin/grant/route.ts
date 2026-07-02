import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { addCredits } from "@/lib/credits";

// 관리자 크레딧 지급 — 이메일로 유저 찾아 지급(멱등 ref로 이중 지급 방지).
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: "관리자만 쓸 수 있어요." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const amount = Math.floor(Number(body.credits));
  if (!email || !Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 100000) {
    return NextResponse.json({ error: "이메일과 크레딧(±100,000 이내)을 확인해 주세요." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const target = data?.users.find((u) => u.email?.toLowerCase() === email);
  if (!target) return NextResponse.json({ error: "해당 이메일 유저가 없어요." }, { status: 404 });

  const ref = `grant_${Date.now()}_${user.id.slice(0, 8)}`;
  const balance = await addCredits(target.id, amount, "admin", ref);
  return NextResponse.json({ ok: true, email, granted: amount, balance });
}
