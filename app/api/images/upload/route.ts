import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";

export const maxDuration = 30;

// ★유저 사진 업로드 — AI 봉인 대체 UX. 슬롯(문서순 idx)에 직접 올린 사진을 저장 → 미리보기·복사 HTML에 포함.
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const articleId = String(form?.get("articleId") ?? "").slice(0, 60);
  const idx = Number(form?.get("idx"));
  if (!(file instanceof File)) return NextResponse.json({ error: "파일이 없어요." }, { status: 400 });
  if (!/^image\//.test(file.type)) return NextResponse.json({ error: "이미지 파일만 올릴 수 있어요." }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "8MB 이하 이미지만 올릴 수 있어요." }, { status: 400 });
  if (!Number.isInteger(idx) || idx < 0 || idx > 19) return NextResponse.json({ error: "자리 정보가 없어요." }, { status: 400 });

  try {
    const admin = createSupabaseAdminClient();
    try { await admin.storage.createBucket("ai-images", { public: true }); } catch { /* 있음 */ }
    const ext = (file.type.split("/")[1] ?? "png").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "png";
    const path = `${user.id}/upload-${crypto.randomUUID()}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await admin.storage.from("ai-images").upload(path, buf, { contentType: file.type });
    if (upErr) return NextResponse.json({ error: "업로드하지 못했어요." }, { status: 500 });
    const url = admin.storage.from("ai-images").getPublicUrl(path).data.publicUrl;
    if (articleId) {
      try {
        const { data: cur } = await supabase.from("articles").select("images").eq("id", articleId).eq("user_id", user.id).single();
        const merged = { ...((cur?.images as Record<string, string>) ?? {}), [String(idx)]: url };
        await supabase.from("articles").update({ images: merged }).eq("id", articleId).eq("user_id", user.id);
      } catch { /* 컬럼 미적용 */ }
    }
    return NextResponse.json({ ok: true, url });
  } catch {
    return NextResponse.json({ error: "업로드하지 못했어요." }, { status: 500 });
  }
}
