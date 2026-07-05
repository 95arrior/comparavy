import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { isTone, isType, isPublishMode, isVertical, VERTICAL_DEFAULTS, VERTICAL_TOPIC, DAY_KEYS, type WeeklyHours, type DayHours } from "@/lib/blogProfile";
import { isTopCategory } from "@/lib/categories";
import { AUDIENCE_VALUES } from "@/lib/audience";
import { defaultBlogName } from "@/lib/blogName";

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

  const { data } = await supabase.from("blog_profiles").select("*").eq("user_id", user.id).eq("is_active", true).maybeSingle();
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
  const sub_category = (typeof body.sub_category === "string" ? body.sub_category : "").trim().slice(0, 40) || null;
  // 네이버 블로그 아이디 — 계정 단위 저장(기기 간 동기화). undefined면 기존값 유지.
  const naver_blog_id = typeof body.naver_blog_id === "string"
    ? body.naver_blog_id.trim().replace(/^https?:\/\//, "").replace(/^m\./, "").replace(/^blog\.naver\.com\//, "").replace(/[/?#].*$/, "").slice(0, 40) || null
    : undefined;
  const biz_name = bizField(body.biz_name, 80);
  const biz_address = bizField(body.biz_address, 200);
  const biz_phone = bizField(body.biz_phone, 40);
  const biz_hours = bizField(body.biz_hours, 120); // 레거시 자유입력(fallback)
  const biz_hours_json = sanitizeHours(body.biz_hours_json); // 요일별 구조화(우선)
  const biz_strength = bizField(body.biz_strength, 200); // 강점·특징(선택) — 글 마무리 업장 연결용
  // 대상(다중) — 화이트리스트 값만, 최대 5개. 글감을 이 대상으로 거른다.
  const audience = Array.isArray(body.audience)
    ? Array.from(new Set(body.audience.filter((a: unknown): a is string => typeof a === "string" && AUDIENCE_VALUES.has(a)))).slice(0, 5)
    : [];
  const biz_detail_address = bizField(body.biz_detail_address, 100); // 상세주소(동·호수 등)
  // 좌표 — 한국 영역(대략 위도 33~39, 경도 124~132) 안의 유한 숫자만 저장, 아니면 null.
  const numOrNull = (v: unknown, lo: number, hi: number): number | null =>
    typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? v : null;
  const biz_lat = numOrNull(body.biz_lat, 33, 39);
  const biz_lng = numOrNull(body.biz_lng, 124, 132);
  const target = (typeof body.target === "string" ? body.target : "").trim().slice(0, 80) || null;
  // 대분류 (없으면 topic을 대분류로 가정 — 레거시 호환)
  const category = (typeof body.category === "string" && isTopCategory(body.category)) ? body.category : (isTopCategory(topic) ? topic : null);
  // 블로그 이름: 비우면 "{대분류} 블로그" 기본값
  const rawName = (typeof body.blog_name === "string" ? body.blog_name : "").trim().slice(0, 60);
  const blog_name = rawName || defaultBlogName(category ?? topic); // 자동 기본값만 '블로그 블로그' 중복 정리(입력은 보존)

  // ★멀티 블로그(0056) — unique(user_id) 해제됨. 저장 규칙:
  //  기본 = '활성 블로그' 행 update(없으면 insert). createNew=true = 기존 활성 내리고 새 블로그 insert(활성).
  const channel = body.channel === "wordpress" ? "wordpress" : "naver"; // ★듀얼 채널 — 기본 naver(기존 무변경)
  const auto_publish = ["daily", "review"].includes(String(body.auto_publish)) ? String(body.auto_publish) : "off";
  const auto_publish_hour = Number.isInteger(body.auto_publish_hour) && body.auto_publish_hour >= 0 && body.auto_publish_hour <= 23 ? body.auto_publish_hour : 7;
  const payload = { user_id: user.id, channel, auto_publish, auto_publish_hour, topic, category, blog_name, tone, article_type, target, publish_mode, vertical, sub_category, ...(naver_blog_id !== undefined ? { naver_blog_id } : {}), biz_name, biz_address, biz_detail_address, biz_lat, biz_lng, biz_phone, biz_hours, biz_hours_json, biz_strength, audience, updated_at: new Date().toISOString() };
  const createNew = body.createNew === true;
  let data: unknown = null; let error: { message: string } | null = null;
  if (createNew) {
    // ★블로그 상한 5개 — 크레딧 공유·일 3편(블로그당) 구조에서 운영 가능한 현실 상한(실수·어뷰징 방지)
    const { count } = await supabase.from("blog_profiles").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    if ((count ?? 0) >= 5) return NextResponse.json({ error: "블로그는 5개까지 만들 수 있어요." }, { status: 400 });
    await supabase.from("blog_profiles").update({ is_active: false }).eq("user_id", user.id).eq("is_active", true);
    ({ data, error } = await supabase.from("blog_profiles").insert({ ...payload, is_active: true }).select("*").single());
  } else {
    const { data: cur } = await supabase.from("blog_profiles").select("id").eq("user_id", user.id).eq("is_active", true).maybeSingle();
    if (cur) ({ data, error } = await supabase.from("blog_profiles").update(payload).eq("id", cur.id).select("*").single());
    else ({ data, error } = await supabase.from("blog_profiles").insert({ ...payload, is_active: true }).select("*").single());
  }
  if (error) {
    return NextResponse.json({ error: `저장 실패: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ profile: data });
}

// 부분 수정 — 네이버 블로그 아이디만 갱신(POST 전체 upsert와 달리 다른 필드 보존).
export async function PATCH(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.naver_blog_id !== "string") return NextResponse.json({ error: "naver_blog_id가 필요해요." }, { status: 400 });
  const id = body.naver_blog_id.trim().replace(/^https?:\/\//, "").replace(/^m\./, "").replace(/^blog\.naver\.com\//, "").replace(/[/?#].*$/, "").slice(0, 40) || null;
  const { error } = await supabase.from("blog_profiles").update({ naver_blog_id: id, updated_at: new Date().toISOString() }).eq("user_id", user.id).eq("is_active", true); // ★활성 블로그만(실측: 전 블로그가 같은 주소로 덮임)
  if (error) return NextResponse.json({ error: "저장하지 못했어요." }, { status: 500 });
  return NextResponse.json({ ok: true, naver_blog_id: id });
}
