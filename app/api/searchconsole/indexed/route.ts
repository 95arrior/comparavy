import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { gscGetValidToken, gscSearchAnalytics } from "@/lib/searchConsole";

// 선행지표 '색인' — 최근 90일 검색에 1회라도 노출된 페이지 수(=구글이 찾아 보여준 글 수).
// 미연결/무데이터는 graceful: { connected, count:0 }.

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ connected: false, count: 0 });
  if (process.env.PRELAUNCH === "true" && !isAdminEmail(user.email)) return NextResponse.json({ connected: false, count: 0 });

  const { data: conn } = await supabase
    .from("searchconsole_connections")
    .select("selected_site")
    .eq("user_id", user.id)
    .maybeSingle();
  const site = conn?.selected_site;
  if (!site) return NextResponse.json({ connected: false, count: 0 });

  const token = await gscGetValidToken(user.id);
  if (!token) return NextResponse.json({ connected: false, count: 0 });

  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 89);
  const res = await gscSearchAnalytics(token, site, { startDate: ymd(start), endDate: ymd(end), dimensions: ["page"], rowLimit: 1000 });
  if (res.error) return NextResponse.json({ connected: true, count: 0 });
  const count = res.rows.filter((r) => r.impressions > 0).length;
  return NextResponse.json({ connected: true, count });
}
