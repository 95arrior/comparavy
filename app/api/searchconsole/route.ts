import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { gscGetValidToken, gscListSites } from "@/lib/searchConsole";

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 }) } as const;
  if (process.env.PRELAUNCH === "true" && !isAdminEmail(user.email)) {
    return { error: NextResponse.json({ error: "아직 오픈 전이에요." }, { status: 403 }) } as const;
  }
  return { supabase, user } as const;
}

// 연결 상태 조회
export async function GET() {
  const r = await requireUser();
  if ("error" in r) return r.error;
  const { data } = await r.supabase
    .from("searchconsole_connections")
    .select("google_email,selected_site,permission_level,refresh_token")
    .eq("user_id", r.user.id)
    .maybeSingle();
  return NextResponse.json({
    connected: Boolean(data?.refresh_token),
    googleEmail: data?.google_email ?? null,
    selectedSite: data?.selected_site ?? null,
    permissionLevel: data?.permission_level ?? null,
  });
}

// 선택한 서치콘솔 속성 저장(목록에 있는 사이트만 허용)
export async function POST(request: Request) {
  const r = await requireUser();
  if ("error" in r) return r.error;
  const body = await request.json().catch(() => ({}));
  const siteUrl = typeof body.siteUrl === "string" ? body.siteUrl : "";
  if (!siteUrl) return NextResponse.json({ error: "사이트를 선택해 주세요." }, { status: 400 });

  const token = await gscGetValidToken(r.user.id);
  if (!token) return NextResponse.json({ error: "먼저 구글 서치콘솔을 연결해 주세요." }, { status: 400 });
  const sites = await gscListSites(token);
  const match = sites.find((s) => s.siteUrl === siteUrl);
  if (!match) return NextResponse.json({ error: "접근 권한이 있는 사이트만 선택할 수 있어요." }, { status: 400 });

  const { error } = await r.supabase
    .from("searchconsole_connections")
    .update({ selected_site: match.siteUrl, permission_level: match.permissionLevel, updated_at: new Date().toISOString() })
    .eq("user_id", r.user.id);
  if (error) return NextResponse.json({ error: `저장 실패: ${error.message}` }, { status: 500 });
  return NextResponse.json({ ok: true, selectedSite: match.siteUrl, permissionLevel: match.permissionLevel });
}

// 연결 해제(행 삭제)
export async function DELETE() {
  const r = await requireUser();
  if ("error" in r) return r.error;
  const { error } = await r.supabase.from("searchconsole_connections").delete().eq("user_id", r.user.id);
  if (error) return NextResponse.json({ error: `해제 실패: ${error.message}` }, { status: 500 });
  return NextResponse.json({ ok: true });
}
