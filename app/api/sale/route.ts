import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";

// 24h 한정 할인 — 계정 단위 1회성. GET=조회, POST=시작(이미 있으면 그대로 반환, 재시작 없음).
// 유효한 할인 = sale_until > now. 결제 승인(/api/credits/confirm)이 이걸 서버에서 검증한다.

async function getUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  if (!hasSupabaseEnv()) return NextResponse.json({ until: 0 });
  const user = await getUser();
  if (!user) return NextResponse.json({ until: 0 });
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin.from("users").select("sale_until").eq("id", user.id).single();
    const t = data?.sale_until ? new Date(data.sale_until).getTime() : 0;
    return NextResponse.json({ until: t > Date.now() ? t : 0 });
  } catch { return NextResponse.json({ until: 0 }); }
}

export async function POST() {
  if (!hasSupabaseEnv()) return NextResponse.json({ until: 0 });
  const user = await getUser();
  if (!user) return NextResponse.json({ until: 0 }, { status: 401 });
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin.from("users").select("sale_until").eq("id", user.id).single();
    if (data?.sale_until) {
      // 이미 시작됨(만료 포함) — 재시작 없음
      const t = new Date(data.sale_until).getTime();
      return NextResponse.json({ until: t > Date.now() ? t : 0 });
    }
    const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await admin.from("users").update({ sale_until: until }).eq("id", user.id);
    return NextResponse.json({ until: new Date(until).getTime() });
  } catch { return NextResponse.json({ until: 0 }); }
}
