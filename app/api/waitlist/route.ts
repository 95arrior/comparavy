import { NextResponse } from "next/server";
import { createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";

/** 사전 등록(웨이트리스트) 이메일 저장. 익명 허용 — 서비스롤로 기록(RLS 우회). */
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const source = typeof body.source === "string" ? body.source.slice(0, 40) : null;

  // 기본 이메일 형식 검증
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
    return NextResponse.json({ error: "이메일 주소를 다시 확인해 주세요." }, { status: 400 });
  }

  try {
    const admin = createSupabaseAdminClient();
    // 같은 이메일은 조용히 무시(중복이어도 사용자에겐 성공으로) → "이미 등록됨"도 긍정 경험
    const { error } = await admin.from("waitlist").upsert({ email, source }, { onConflict: "email" });
    if (error) return NextResponse.json({ error: "등록에 실패했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "등록에 실패했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
