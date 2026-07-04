import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";

// 아침 체크인 — GET: 최근 시리즈+오늘 완료 여부, POST: 어제 데이터 upsert(수동 입력만).
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export async function GET() {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const { data } = await supabase.from("checkins").select("day, visitors, revenue").eq("user_id", user.id).order("day", { ascending: false }).limit(60);
  const rows = (data ?? []).reverse();
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yk = dayKey(y);
  const doneToday = rows.some((r) => r.day === yk); // 오늘 체크인 = 어제 데이터 존재
  const prev = rows.filter((r) => r.day !== yk).at(-1) ?? null; // '어제와 같음' 빠른 버튼용 직전 값
  return NextResponse.json({ rows, doneToday, yesterdayKey: yk, prev }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const num = (v: unknown, max: number) => { const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n) : null; };
  const visitors = num(body.visitors, 1_000_000);
  const revenue = num(body.revenue, 100_000_000);
  if (visitors === null && revenue === null) return NextResponse.json({ error: "숫자를 입력해 주세요." }, { status: 400 });
  const y = new Date(); y.setDate(y.getDate() - 1);
  const { error } = await supabase.from("checkins").upsert({ user_id: user.id, day: dayKey(y), visitors, revenue }, { onConflict: "user_id,day" });
  if (error) return NextResponse.json({ error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  return NextResponse.json({ ok: true, day: dayKey(y), visitors, revenue });
}
