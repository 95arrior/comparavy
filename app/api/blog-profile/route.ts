import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { isTone, isType, isPublishMode, isVertical, VERTICAL_DEFAULTS, VERTICAL_TOPIC, DAY_KEYS, type WeeklyHours, type DayHours } from "@/lib/blogProfile";
import { isTopCategory } from "@/lib/categories";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
// 클라 입력을 그대로 믿지 않고 정규화: 알려진 요일 키만, 시간은 HH:MM, closed는 boolean.
function sanitizeHours(v: unknown): WeeklyHours | null {
  if (!v || typeof v !== "object") return null;
  const src = v as Record<string, unknown>;
  const out: WeeklyHours = {};
  let any = false;
  for (const day of DAY_KEYS) {
    const d = src[day];
    if (!d || typeof d !== "object") continue;
    const o = d as Record<string, unknown>;
    if (o.closed === true) { out[day] = { closed: true }; any = true; continue; }
    const open = typeof o.open === "string" && TIME_RE.test(o.open) ? o.open : undefined;
    const close = typeof o.close === "string" && TIME_RE.test(o.close) ? o.close : undefined;
    if (open && close) {
      const dh: DayHours = { open, close };
      const bs = typeof o.breakStart === "string" && TIME_RE.test(o.breakStart) ? o.breakStart : undefined;
      const be = typeof o.breakEnd === "string" && TIME_RE.test(o.breakEnd) ? o.breakEnd : undefined;
      if (bs && be) { dh.breakStart = bs; dh.breakEnd = be; }
      out[day] = dh;
      any = true;
    }
  }
  return any ? out : null;
}

/**
 * 블로그 프로필 — 온보딩 1회 저장(유저당 1행). 이후 모든 글이 이 설정을 따른다.
 * GET: 현재 프로필 조회(없으면 null). POST: 업서트.
 */
export async function GET() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const { data } = await supabase.from("blog_profiles").select("*").eq("user_id", user.id).maybeSingle();
  return NextResponse.json({ profile: data ?? null });
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  if (process.env.PRELAUNCH === "true" && !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "아직 오픈 전이에요." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const vertical = isVertical(body.vertical) ? body.vertical : "general";
  // 토스식 온보딩은 카테고리(topic)를 안 받음 → 비면 업종 라벨로 채워 NOT NULL 안전. (편집은 topic을 보내므로 그 값 우선)
  const rawTopic = (typeof body.topic === "string" ? body.topic : "").trim().slice(0, 60);
  const topic = rawTopic || VERTICAL_TOPIC[vertical] || "생활정보";

  // 문체 단계가 없으면 업종 기본 톤 사용(보낸 값 있으면 그것 우선 — 기존 편집 호환).
  const tone = isTone(body.tone) ? body.tone : (VERTICAL_DEFAULTS[vertical]?.tone ?? "friendly");
  const article_type = isType(body.article_type) ? body.article_type : "info";
  const publish_mode = isPublishMode(body.publish_mode) ? body.publish_mode : "manual";
  // 업체 정보(선택) — 있는 것만 저장, 빈 값은 null
  const bizField = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "") || null;
  const biz_name = bizField(body.biz_name, 80);
  const biz_address = bizField(body.biz_address, 200);
  const biz_phone = bizField(body.biz_phone, 40);
  const biz_hours = bizField(body.biz_hours, 120); // 레거시 자유입력(fallback)
  const biz_hours_json = sanitizeHours(body.biz_hours_json); // 요일별 구조화(우선)
  const target = (typeof body.target === "string" ? body.target : "").trim().slice(0, 80) || null;
  // 대분류 (없으면 topic을 대분류로 가정 — 레거시 호환)
  const category = (typeof body.category === "string" && isTopCategory(body.category)) ? body.category : (isTopCategory(topic) ? topic : null);
  // 블로그 이름: 비우면 "{대분류} 블로그" 기본값
  const rawName = (typeof body.blog_name === "string" ? body.blog_name : "").trim().slice(0, 60);
  const blog_name = rawName || `${category ?? topic} 블로그`;

  const { data, error } = await supabase
    .from("blog_profiles")
    .upsert(
      { user_id: user.id, topic, category, blog_name, tone, article_type, target, publish_mode, vertical, biz_name, biz_address, biz_phone, biz_hours, biz_hours_json, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: `저장 실패: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ profile: data });
}
