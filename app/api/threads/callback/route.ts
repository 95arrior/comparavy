import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { exchangeThreadsCode } from "@/lib/threads";
import { encryptSecret } from "@/lib/crypto";

// 스레드 인증 후 돌아오는 콜백 — code를 장기 토큰으로 교환해 저장.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: "권한이 없어요." }, { status: 403 });
  if (!code) return NextResponse.redirect(`${url.origin}/dashboard?threads=error`);
  try {
    const redirect = process.env.THREADS_REDIRECT_URI || `${url.origin}/api/threads/callback`;
    const { token, userId, expiresInSec } = await exchangeThreadsCode(code, redirect);
    const admin = createSupabaseAdminClient();
    await admin
      .from("social_settings")
      .update({
        threads_user_id: userId,
        threads_access_token: encryptSecret(token),
        threads_token_expires_at: new Date(Date.now() + expiresInSec * 1000).toISOString(),
        threads_enabled: true,
      })
      .eq("id", 1);
    return NextResponse.redirect(`${url.origin}/dashboard?threads=connected`);
  } catch {
    return NextResponse.redirect(`${url.origin}/dashboard?threads=error`);
  }
}
