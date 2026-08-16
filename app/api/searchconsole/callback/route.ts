import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { gscRedirectUri, gscExchangeCode, gscStoreConnection } from "@/lib/searchConsole";

// 구글 동의 후 복귀 지점: state 검증 → code를 토큰으로 교환 → 암호화 저장 → 대시보드로.
export async function GET(req: Request) {
  const { origin, searchParams } = new URL(req.url);
  const back = (q: string) => NextResponse.redirect(`${origin}/dashboard?${q}`);

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const err = searchParams.get("error");
  if (err) return back("gsc=denied");

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  // CSRF: connect에서 심은 state 쿠키와 대조
  const stateCookie = req.headers.get("cookie")?.match(/(?:^|;\s*)gsc_oauth_state=([^;]+)/)?.[1];
  if (!code || !state || !stateCookie || state !== stateCookie) {
    return back("gsc=state_error");
  }

  const tok = await gscExchangeCode(code, gscRedirectUri(origin));
  if (!tok.access_token) return back("gsc=token_error");

  const { ok } = await gscStoreConnection(user.id, tok);
  const res = back(ok ? "gsc=connected" : "gsc=save_error");
  res.cookies.set("gsc_oauth_state", "", { maxAge: 0, path: "/" }); // 1회용 state 정리
  return res;
}
