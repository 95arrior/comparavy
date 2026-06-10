import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { generateCardNews } from "@/lib/cardNews";
import { renderSlide } from "@/lib/cardImage";

export const maxDuration = 300;

const BUCKET = "social-cards";

/** 관리자 전용 — 주제로 카드뉴스 자동 생성 → 이미지 렌더·호스팅 → 보관함(social_posts)에 적재. */
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: "권한이 없어요." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const topic = typeof body.topic === "string" ? body.topic.trim().slice(0, 80) : "";
  if (!topic) return NextResponse.json({ error: "주제를 입력해 주세요." }, { status: 400 });

  try {
    // ① 카피 생성
    const card = await generateCardNews(topic);

    // ② 슬라이드 렌더 → ③ 업로드(공개 URL)
    const admin = createSupabaseAdminClient();
    await admin.storage.createBucket(BUCKET, { public: true }).catch(() => {});
    const stamp = Date.now();
    const urls: string[] = [];
    for (let i = 0; i < card.slides.length; i++) {
      const png = await renderSlide(card.slides[i], i, card.slides.length);
      const path = `${stamp}/${i}.png`;
      const { error: upErr } = await admin.storage.from(BUCKET).upload(path, png, { contentType: "image/png", upsert: true });
      if (upErr) throw new Error(`이미지 업로드 실패: ${upErr.message}`);
      urls.push(admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
    }

    // ④ 보관함에 적재 (캐러셀)
    const { error } = await admin.from("social_posts").insert({ type: "carousel", media_urls: urls, caption: card.caption });
    if (error) return NextResponse.json({ error: `보관함 저장 실패: ${error.message}` }, { status: 502 });

    return NextResponse.json({ ok: true, slides: urls.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "생성에 실패했어요." }, { status: 502 });
  }
}
