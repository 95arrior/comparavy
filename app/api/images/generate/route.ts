import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { spendCredits, addCredits } from "@/lib/credits";
import { IMAGE_COST } from "@/lib/creditPacks";
import { generateBlogImage, imageReady, GEMINI_IMAGE_MODEL } from "@/lib/geminiImage";
import { composeThumbnail } from "@/lib/composeThumbnail";
import { logUsage } from "@/lib/usageLog";

// 대표이미지(슬롯0) PNG를 스토리지에 올리고 URL 반환(실패 시 null → 호출측 dataUrl 폴백).
async function uploadPng(userId: string, png: Buffer): Promise<string | null> {
  try {
    const admin = createSupabaseAdminClient();
    try { await admin.storage.createBucket("ai-images", { public: true }); } catch { /* 있음 */ }
    const path = `${userId}/${crypto.randomUUID()}.png`;
    const { error } = await admin.storage.from("ai-images").upload(path, png, { contentType: "image/png" });
    if (error) return null;
    return admin.storage.from("ai-images").getPublicUrl(path).data.publicUrl;
  } catch { return null; }
}

export const maxDuration = 60;

// AI 이미지 생성 — 장당 IMAGE_COST 크레딧. ★적자 불가 구조: 키 확인 → 선차감 → 생성 → 실패 시 멱등 환불.
// 실패는 usage_log(kind: image_fail)로 남겨 관리자 대시보드가 감시(잔액 소진 조기 경보).
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (process.env.PRELAUNCH === "true" && !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "곧 열릴 예정이에요." }, { status: 403 });
  }
  // ★차감 전에 준비 확인 — 키 없으면 돈부터 받지 않는다
  if (!imageReady()) return NextResponse.json({ error: "이미지 기능을 준비하고 있어요.", code: "NOT_READY" }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const slot = String(body.slot ?? "").trim().slice(0, 200);
  const title = String(body.title ?? "").trim().slice(0, 120);
  const thumbnail = body.thumb === true; // 1번(대표) = 3초 훅 프롬프트
  const articleId = typeof body.articleId === "string" ? body.articleId.slice(0, 60) : null;
  const slotIdx = Number.isInteger(body.idx) && body.idx >= 0 && body.idx <= 9 ? (body.idx as number) : null;
  if (!slot) return NextResponse.json({ error: "어떤 이미지가 필요한지 알 수 없어요." }, { status: 400 });

  // ★대표이미지(슬롯0) + 합성 카피 있으면 = v4 코드 합성. 무료(AI 없음·크레딧 0) → 이중차감 구조적 불가.
  const tc = body.thumbCopy;
  const thumbCopy = (tc && typeof tc === "object")
    ? { mainCopy: String(tc.mainCopy ?? "").slice(0, 40), subCopy: String(tc.subCopy ?? "").slice(0, 30), badge: String(tc.badge ?? "").slice(0, 20) }
    : null;
  if (thumbnail && thumbCopy) {
    try {
      const seed = typeof body.articleSeed === "string" ? body.articleSeed.slice(0, 80) : null;
      const { png } = await composeThumbnail({ userId: user.id, thumb: thumbCopy, articleId: seed, useAiBackground: false });
      const url = await uploadPng(user.id, png);
      if (url && articleId && slotIdx !== null) {
        try {
          const { data: cur } = await supabase.from("articles").select("images").eq("id", articleId).eq("user_id", user.id).single();
          const merged = { ...((cur?.images as Record<string, string>) ?? {}), [String(slotIdx)]: url };
          await supabase.from("articles").update({ images: merged }).eq("id", articleId).eq("user_id", user.id);
        } catch { /* 컬럼 미적용 — 기기 저장 폴백 */ }
      }
      return NextResponse.json({ ok: true, url, dataUrl: url ? undefined : `data:image/png;base64,${png.toString("base64")}` }); // credits 미변경(무료)
    } catch {
      // 합성 실패 → 썸네일 생략(과금 0, 발행 지장 없음). 본문 이미지는 별도 슬롯에서 계속.
      return NextResponse.json({ ok: false, skipped: true, error: "썸네일을 만들지 못했어요." });
    }
  }

  // 본문 이미지(또는 카피 없는 대표) — 유료 Gemini. 선차감(원자적) — 부족하면 402
  const balance = await spendCredits(user.id, IMAGE_COST, "image");
  if (balance === null) return NextResponse.json({ error: "크레딧이 부족해요.", code: "NO_CREDITS" }, { status: 402 });

  const refundRef = crypto.randomUUID();
  try {
    const img = await generateBlogImage(slot, title, user.id, { thumbnail });
    void logUsage({ userId: user.id, model: GEMINI_IMAGE_MODEL, kind: "image", inputTokens: 0, outputTokens: 1290 });
    // 스토리지 업로드 — URL로 반환(재방문·기기 간 유지). 실패하면 dataUrl 폴백.
    let url: string | null = null;
    try {
      const admin = createSupabaseAdminClient();
      try { await admin.storage.createBucket("ai-images", { public: true }); } catch { /* 이미 있음 */ }
      const path = `${user.id}/${crypto.randomUUID()}.png`;
      const { error: upErr } = await admin.storage.from("ai-images").upload(path, Buffer.from(img.base64, "base64"), { contentType: img.mime });
      if (!upErr) url = admin.storage.from("ai-images").getPublicUrl(path).data.publicUrl;
    } catch { /* 폴백 */ }
    // ★계정 저장 — 웹·모바일 어디서든 보이게(재과금 방지). RLS로 본인 글만.
    if (url && articleId && slotIdx !== null) {
      try {
        const { data: cur } = await supabase.from("articles").select("images").eq("id", articleId).eq("user_id", user.id).single();
        const merged = { ...((cur?.images as Record<string, string>) ?? {}), [String(slotIdx)]: url };
        await supabase.from("articles").update({ images: merged }).eq("id", articleId).eq("user_id", user.id);
      } catch { /* 컬럼 미적용 — 기기 저장 폴백 유지 */ }
    }
    return NextResponse.json({ ok: true, url, dataUrl: url ? undefined : `data:${img.mime};base64,${img.base64}`, credits: balance });
  } catch (e) {
    // 멱등 환불 — 같은 ref 재시도에도 1회만
    const refunded = await addCredits(user.id, IMAGE_COST, "refund_image", refundRef).catch(() => null);
    const msg = e instanceof Error ? e.message : "";
    void logUsage({ userId: user.id, model: GEMINI_IMAGE_MODEL, kind: msg === "QUOTA" ? "image_quota_fail" : "image_fail", inputTokens: 0, outputTokens: 0 });
    const friendly = msg === "QUOTA"
      ? "이미지 생성이 잠시 몰려 있어요. 크레딧은 돌려드렸으니 잠시 후 다시 시도해 주세요."
      : "이미지를 만들지 못했어요. 크레딧은 돌려드렸어요.";
    return NextResponse.json({ error: friendly, credits: refunded ?? undefined }, { status: 502 });
  }
}
