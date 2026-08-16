import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { countBodyChars } from "@/lib/humanizer";
import { bumpMixWeight } from "@/lib/checkin";
import { isReviewType } from "@/lib/revenue";

async function getUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 아직이에요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  // (구 '프로 전용 편집' 게이트 철거 — 크레딧 시대엔 전원 유료라 근거 없음. 발행 표시·규제 수정이 전 유저에게 필요)
  const body = await request.json().catch(() => ({}));

  // ★이미지 URL 병합 저장 — 기기 아닌 계정에(웹·모바일 동기화). {"0":url,...} 형태만 허용.
  if (body.images && typeof body.images === "object" && !Array.isArray(body.images)) {
    const incoming: Record<string, string> = {};
    for (const [k, v] of Object.entries(body.images as Record<string, unknown>)) {
      if (/^[0-9]$/.test(k) && typeof v === "string" && v.startsWith("https://") && v.length < 500) incoming[k] = v;
    }
    if (Object.keys(incoming).length > 0) {
      try {
        const { data: cur } = await supabase.from("articles").select("images").eq("id", id).eq("user_id", user.id).single();
        const merged = { ...(cur?.images ?? {}), ...incoming };
        await supabase.from("articles").update({ images: merged }).eq("id", id).eq("user_id", user.id);
      } catch { /* 컬럼 미적용 등 — 기능엔 지장 없음 */ }
    }
  }
  // ★증폭 신호 — '이 글 반응 좋아요'(수동) / 체크인 급등 후속 선택. hot_at 기록 + 배합 가중 학습(상한·하한 코드 강제).
  if (body.hot === true) {
    try {
      const { data: art } = await supabase.from("articles").select("keyword, title").eq("id", id).eq("user_id", user.id).single();
      await supabase.from("articles").update({ hot_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
      const type = art && isReviewType({ keyword: art.keyword, title: art.title }) ? "review" : "info";
      const { data: prof } = await supabase.from("blog_profiles").select("mix_weights").eq("user_id", user.id).eq("is_active", true).maybeSingle();
      await supabase.from("blog_profiles").update({ mix_weights: bumpMixWeight(prof?.mix_weights as Record<string, number> | null, type) }).eq("user_id", user.id);
    } catch { /* 0054 미적용 — 신호만 유실, 무해 */ }
    return NextResponse.json({ ok: true });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.title === "string") update.title = body.title;
  if (typeof body.body_html === "string") {
    update.body_html = body.body_html;
    update.char_count = countBodyChars(body.body_html);
  }
  if (typeof body.meta_title === "string") update.meta_title = body.meta_title.slice(0, 60);
  if (typeof body.meta_description === "string") {
    update.meta_description = body.meta_description.slice(0, 160);
  }
  if (typeof body.featured_image === "string" || body.featured_image === null) {
    update.featured_image = body.featured_image;
  }
  if (Array.isArray(body.tags)) {
    update.tags = body.tags.filter((t: unknown): t is string => typeof t === "string").slice(0, 8);
  }
  if (typeof body.category === "string") update.category = body.category;
  // 네이버 수동 발행 표시 — '네이버에 올렸어요'/'내렸어요'로 상태만 전환(자동발행 없는 네이버용)
  if (["published", "draft", "copied", "pending_verify", "deleted"].includes(body.status)) {
    update.status = body.status; // verified는 클라 직접 금지 — /api/verify-post(RSS·URL 확인)만 부여
    if (body.status === "pending_verify") { update.claimed_at = new Date().toISOString(); update.verify_attempts = 0; }
  }

  const run = () =>
    supabase.from("articles").update(update).eq("id", id).eq("user_id", user.id).select("*").single();

  let { data, error } = await run();
  // 아직 마이그레이션 안 된 선택 컬럼(tags·category)을 가리키는 오류면 그 컬럼만 빼고 재시도 → 저장이 깨지지 않게
  for (const col of ["tags", "category"]) {
    if (error && new RegExp(col, "i").test(error.message ?? "")) {
      delete update[col];
      ({ data, error } = await run());
    }
  }

  if (error) return NextResponse.json({ error: "저장하지 못했어요." }, { status: 500 });
  return NextResponse.json({ article: data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // 크레딧 선차감 시대 — 삭제해도 이미 결제된 생성이라 어뷰징 여지 없음(구 무료한도 방어 폐기).
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const { id } = await params;
  const { error } = await supabase.from("articles").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "삭제하지 못했어요." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
