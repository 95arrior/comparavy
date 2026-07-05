import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isSpike } from "@/lib/checkin";

// 아침 체크인 — GET: 최근 시리즈+오늘 완료 여부, POST: 어제 데이터 upsert(수동 입력만).
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export async function GET() {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  // ★블로그별 분리(0057) — 활성 블로그의 기록만(레거시 null 포함: 과거 계정 단위 기록 연속성)
  const { data: ap } = await supabase.from("blog_profiles").select("id").eq("user_id", user.id).eq("is_active", true).maybeSingle();
  let q = supabase.from("checkins").select("day, visitors, revenue").eq("user_id", user.id);
  if (ap?.id) q = q.or(`blog_id.eq.${ap.id},blog_id.is.null`);
  const { data } = await q.order("day", { ascending: false }).limit(60);
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
  // ★소급 입력(놓친 날 채우기) — body.day가 어제~7일 전 범위면 그 날짜로 기록
  if (typeof body.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.day)) {
    const target = new Date(`${body.day}T00:00:00+09:00`).getTime();
    const min = Date.now() - 8 * 86400000, max = Date.now() - 0.5 * 86400000;
    if (target >= min && target <= max) { const d2 = new Date(body.day); y.setFullYear(d2.getFullYear(), d2.getMonth(), d2.getDate()); }
  }
  const { data: ap } = await supabase.from("blog_profiles").select("id").eq("user_id", user.id).eq("is_active", true).maybeSingle();
  // 0057 적용 후: (user, blog, day) 단위. 미적용(컬럼 없음)이면 구 동작으로 폴백 — 저장이 죽지 않게
  let { error } = await supabase.from("checkins").upsert({ user_id: user.id, blog_id: ap?.id ?? null, day: dayKey(y), visitors, revenue }, { onConflict: "user_id,blog_id,day" });
  if (error) {
    ({ error } = await supabase.from("checkins").upsert({ user_id: user.id, day: dayKey(y), visitors, revenue }, { onConflict: "user_id,day" }));
  }
  if (error) return NextResponse.json({ error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  // ★급등 감지(증폭 신호) — 유저 입력만 근거. 감지 시 카드가 "어제 어떤 글이 잘 됐어요?" 후속 질문.
  let spike = false;
  try {
    let pq = supabase.from("checkins").select("day, visitors, revenue").eq("user_id", user.id).lt("day", dayKey(y));
    if (ap?.id) pq = pq.or(`blog_id.eq.${ap.id},blog_id.is.null`);
    const { data: prev } = await pq.order("day", { ascending: false }).limit(7);
    spike = isSpike(visitors, (prev ?? []).reverse());
  } catch { /* ignore */ }
  // ★즉석 판정(무쓸모 체감 해소) — 기록의 보상: 며칠차 대비 통상 범위 판정을 바로 돌려준다(통설 벤치마크, 보장 아님)
  let verdict: string | null = null;
  try {
    if (typeof visitors === "number") {
      let fq = supabase.from("articles").select("created_at").eq("user_id", user.id).not("status", "in", "(pre_generating,pre_generated,generating)").order("created_at", { ascending: true }).limit(1);
      const { data: firstArt } = await fq;
      const started = firstArt?.[0]?.created_at ? new Date(firstArt[0].created_at).getTime() : Date.now();
      const days = Math.max(1, Math.ceil((Date.now() - started) / 86400000));
      const BM: [number, number, number][] = [[3, 0, 5], [7, 0, 20], [14, 10, 50], [30, 30, 100], [90, 50, 300], [180, 100, 500], [365, 200, 1000]];
      const [, lo, hi] = BM.find(([d]) => days <= d) ?? BM[BM.length - 1];
      verdict = visitors > hi
        ? `${days}일차 기준 통상 범위(${lo}~${hi})를 넘었어요 — 상위권 페이스예요`
        : visitors >= lo
        ? `${days}일차 통상 범위(${lo}~${hi}) 안 — 정상 궤도예요`
        : `${days}일차 통상 범위(${lo}~${hi})보다 낮아요 — 꾸준함이 답이에요, 초기엔 흔해요`;
    }
  } catch { /* 판정 실패 = 생략 */ }
  return NextResponse.json({ ok: true, day: dayKey(y), visitors, revenue, spike, verdict });
}
