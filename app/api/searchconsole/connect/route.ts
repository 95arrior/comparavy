import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { gscConfigured, gscRedirectUri, gscAuthUrl } from "@/lib/searchConsole";
import crypto from "crypto";

// 사용자가 '구글 서치콘솔 연결'을 누르면 구글 동의 화면으로 보낸다(동의 후 /api/searchconsole/callback 로 복귀).
export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${new URL(req.url).origin}/login`);
  // PRELAUNCH 중에는 관리자만(출시 때 프로로 개방)
  if (process.env.PRELAUNCH === "true" && !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "아직 오픈 전이에요." }, { status: 403 });
  }
  if (!gscConfigured()) {
    return NextResponse.json({ error: "GOOGLE_OAUTH_CLIENT_ID/SECRET 가 설정되지 않았어요." }, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(gscAuthUrl(gscRedirectUri(origin), state));
  // CSRF 방지: state를 짧은 httpOnly 쿠키에 담아 콜백에서 대조
  res.cookies.set("gsc_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
