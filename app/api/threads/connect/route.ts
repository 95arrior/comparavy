import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { threadsAuthUrl, threadsConfigured } from "@/lib/threads";

// 관리자가 누르면 스레드 인증 화면으로 보냄(동의 후 /api/threads/callback 로 돌아옴).
export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: "권한이 없어요." }, { status: 403 });
  if (!threadsConfigured()) return NextResponse.json({ error: "THREADS_APP_ID/THREADS_APP_SECRET 가 설정되지 않았어요." }, { status: 500 });
  const redirect = process.env.THREADS_REDIRECT_URI || `${new URL(req.url).origin}/api/threads/callback`;
  return NextResponse.redirect(threadsAuthUrl(redirect));
}
