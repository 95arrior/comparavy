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

  // 진단 응답(선택) — 진단 경유 신청에서만 들어옴. 작은 객체만 허용(과도한 페이로드 차단).
  let diagnosis: Record<string, unknown> | null = null;
  if (body.diagnosis && typeof body.diagnosis === "object" && !Array.isArray(body.diagnosis)) {
    const raw = JSON.stringify(body.diagnosis);
    if (raw.length <= 2000) diagnosis = body.diagnosis as Record<string, unknown>;
  }

  // 기본 이메일 형식 검증
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
    return NextResponse.json({ error: "이메일 주소를 다시 확인해 주세요." }, { status: 400 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("waitlist").insert({ email, source, ...(diagnosis ? { diagnosis } : {}) });
    if (error) {
      // 유니크 제약 위반 = 이미 등록된 이메일 → 중복 안내
      if (error.code === "23505") return NextResponse.json({ ok: true, already: true });
      return NextResponse.json({ error: "등록에 실패했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, already: false });
  } catch {
    return NextResponse.json({ error: "등록에 실패했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
