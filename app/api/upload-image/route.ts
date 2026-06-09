import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { ensureUserRow } from "@/lib/userPlan";

const BUCKET = "article-images";
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

/**
 * 본문/대표 이미지를 Supabase Storage에 올리고 공개 URL을 돌려준다.
 * → 본문(body_html)에는 무거운 base64가 아니라 URL만 들어가서 저장이 실패하지 않는다.
 */
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 완료되지 않았습니다." }, { status: 500 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  // 이미지 삽입(편집)은 프로 전용
  const planRow = await ensureUserRow(supabase, user.id);
  if (planRow.plan !== "pro") {
    return NextResponse.json(
      { error: "이미지 삽입은 프로 플랜 기능이에요.", upgrade: true },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const dataUri = typeof body.dataUri === "string" ? body.dataUri : "";
  if (!dataUri.startsWith("data:")) {
    return NextResponse.json({ error: "이미지 데이터가 올바르지 않습니다." }, { status: 400 });
  }

  const comma = dataUri.indexOf(",");
  const mime = dataUri.slice(5, comma).split(";")[0] || "image/png";
  if (!mime.startsWith("image/")) {
    return NextResponse.json({ error: "이미지 파일만 올릴 수 있어요." }, { status: 400 });
  }
  const ext = (mime.split("/")[1] || "png").replace("jpeg", "jpg").replace("svg+xml", "svg");
  const buffer = Buffer.from(dataUri.slice(comma + 1), "base64");
  if (buffer.length > MAX_BYTES) {
    return NextResponse.json({ error: "이미지가 너무 커요. 8MB 이하로 올려주세요." }, { status: 413 });
  }

  const admin = createSupabaseAdminClient();
  // 버킷이 없으면 만든다(공개). 이미 있으면 오류 무시.
  await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES }).catch(() => {});

  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: mime,
    upsert: false,
  });
  if (error) {
    return NextResponse.json({ error: `이미지 업로드 실패: ${error.message}` }, { status: 500 });
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: pub.publicUrl });
}
