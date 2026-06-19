import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { googleAdsConfigured, fetchGoogleKeywordIdeas } from "@/lib/googleAdsKeyword";

// 관리자 전용 — 구글 애즈 자격증명/호출 점검. ?seed=임플란트
export const maxDuration = 60;

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: "권한이 없어요." }, { status: 403 });

  if (!googleAdsConfigured()) {
    return NextResponse.json({ ok: false, error: "구글 애즈 env 6개가 다 안 들어갔어요(또는 빈 값)." }, { status: 400 });
  }

  const seed = new URL(req.url).searchParams.get("seed") || "임플란트";
  try {
    const list = await fetchGoogleKeywordIdeas(seed);
    return NextResponse.json({
      ok: true,
      seed,
      count: list.length,
      sample: list.slice(0, 15), // 상위 15개 미리보기
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
