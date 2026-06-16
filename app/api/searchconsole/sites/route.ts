import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { gscGetValidToken, gscListSites } from "@/lib/searchConsole";

// 연결된 구글 계정이 접근 가능한 서치콘솔 속성(사이트) 목록.
export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (process.env.PRELAUNCH === "true" && !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "아직 오픈 전이에요." }, { status: 403 });
  }
  void req;

  const token = await gscGetValidToken(user.id);
  if (!token) return NextResponse.json({ error: "먼저 구글 서치콘솔을 연결해 주세요." }, { status: 400 });

  const sites = await gscListSites(token);
  return NextResponse.json({ sites });
}
