import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { hasNaverAdEnv } from "@/lib/naverKeyword";
import { VERTICAL_SUBS } from "@/lib/verticalSubs";
import { buildPoolForSub } from "@/lib/keywordPool";

// 관리자 전용 키워드 풀 적재 — Vercel(운영 env)에서 sub 하나씩 호출.
// 비관리자는 인증 단계에서 막혀 네이버/비용 0. 한 번에 sub 하나(타임아웃 안전).
export const maxDuration = 300;

export async function GET(req: Request) {
  // ── 관리자 인증 (로그인 + 이메일 화이트리스트). 여기 통과 못 하면 발굴·네이버 호출 0 ──
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: "권한이 없어요." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const vertical = searchParams.get("vertical") ?? "";
  const sub = searchParams.get("sub") ?? "";

  const subs = VERTICAL_SUBS[vertical];
  if (!subs) {
    return NextResponse.json(
      { error: "vertical을 지정하세요.", verticals: Object.keys(VERTICAL_SUBS) },
      { status: 400 },
    );
  }

  // sub 미지정 → 적재 안 하고 세부 목록만(비용 0)
  if (!sub) {
    return NextResponse.json({
      vertical,
      subs,
      hint: `세부 하나씩 호출하세요: ?vertical=${vertical}&sub=${encodeURIComponent(subs[0])}`,
    });
  }
  if (!subs.includes(sub)) {
    return NextResponse.json({ error: `'${sub}'는 ${vertical} 세부에 없어요.`, subs }, { status: 400 });
  }
  if (!hasNaverAdEnv()) {
    return NextResponse.json({ error: "네이버 키가 설정되지 않았어요(운영 env 확인)." }, { status: 500 });
  }

  // ── 한 세부만 적재 ──
  try {
    const r = await buildPoolForSub(vertical, sub);
    const idx = subs.indexOf(sub);
    const nextSub = idx + 1 < subs.length ? subs[idx + 1] : null;
    return NextResponse.json({
      ...r,
      nextSub,
      nextUrl: nextSub ? `?vertical=${vertical}&sub=${encodeURIComponent(nextSub)}` : null,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "적재 실패" }, { status: 500 });
  }
}
