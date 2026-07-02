import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { countKoreanChars } from "@/lib/humanizer";
import { ensureUserRow } from "@/lib/userPlan";

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

  // 글 편집은 프로 전용 (무료는 생성·복사만)
  const planRow = await ensureUserRow(supabase, user.id);
  if (planRow.plan !== "pro") {
    return NextResponse.json(
      { error: "글 편집은 프로 플랜 기능이에요. 프로로 업그레이드하면 수정·이미지 삽입·발행을 할 수 있어요.", upgrade: true },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = {};
  if (typeof body.title === "string") update.title = body.title;
  if (typeof body.body_html === "string") {
    update.body_html = body.body_html;
    update.char_count = countKoreanChars(body.body_html);
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
  if (body.status === "published" || body.status === "draft") update.status = body.status;

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
