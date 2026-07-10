import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { spendCredits, addCredits } from "@/lib/credits";
import { IMAGE_COST } from "@/lib/creditPacks";
import { generateBlogImage, imageReady, GEMINI_IMAGE_MODEL } from "@/lib/geminiImage";
import { composeThumbnail } from "@/lib/composeThumbnail";
import { AI_IMAGES_ENABLED } from "@/config/publish";
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

function refundKeyTM(userId: string, copy: string): string { return `tm-${userId}-${copy}`.slice(0, 60); }

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
  if (!slot && body.thumbMaker !== true) return NextResponse.json({ error: "어떤 이미지가 필요한지 알 수 없어요." }, { status: 400 });

  // ★데이터 카드 슬롯 = satori 코드 렌더(무료·크레딧 0). 값은 클라가 [카드:] 마커에서 파싱해 전달.
  if (body.slotType === "card" && Array.isArray(body.cardItems)) {
    try {
      const { renderDataCard } = await import("@/lib/dataCard");
      const items = (body.cardItems as { label?: unknown; value?: unknown }[])
        .map((it) => ({ label: String(it.label ?? "").slice(0, 20), value: String(it.value ?? "").slice(0, 28) }))
        .filter((it) => it.label && it.value).slice(0, 3);
      if (items.length === 0) return NextResponse.json({ ok: false, skipped: true });
      const png = await renderDataCard(items, user.id, 1000);
      const url = await uploadPng(user.id, png);
      if (url && articleId && slotIdx !== null) {
        try {
          const { data: cur } = await supabase.from("articles").select("images").eq("id", articleId).eq("user_id", user.id).single();
          const merged = { ...((cur?.images as Record<string, string>) ?? {}), [String(slotIdx)]: url };
          await supabase.from("articles").update({ images: merged }).eq("id", articleId).eq("user_id", user.id);
        } catch { /* 컬럼 미적용 */ }
      }
      return NextResponse.json({ ok: true, url, dataUrl: url ? undefined : `data:image/png;base64,${png.toString("base64")}` }); // 무료
    } catch {
      return NextResponse.json({ ok: false, skipped: true, error: "카드를 만들지 못했어요." });
    }
  }

  // ★썸네일 메이커(유저 요청 2026-07-05) — 문구·배경색·톤 선택형. 3D(AI) 배경=IMAGE_COST, 심플(코드) 배경=무료.
  if (body.thumbMaker === true) {
    const mainRaw = String(body.mainCopy ?? "").trim().slice(0, 40);
    if (!mainRaw) return NextResponse.json({ error: "썸네일 문구를 입력해 주세요." }, { status: 400 });
    const { breakThumbCopy } = await import("@/lib/thumbCopyBreak");
    const paletteName = typeof body.paletteName === "string" ? body.paletteName.slice(0, 30) : undefined;
    const wash = typeof body.wash === "number" ? Math.min(0.85, Math.max(0, body.wash)) : 0.35;
    // ★유저 업로드 배경(2026-07-10 유저 요청: "텍스트만 너가, 배경은 내가") — 무료, AI 호출 없음
    const customBg = typeof body.customBg === "string"
      && /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(body.customBg)
      && body.customBg.length < 6_000_000
      ? body.customBg : null;
    const aiBg = body.aiBg === true && !customBg;
    if (aiBg && !imageReady()) return NextResponse.json({ error: "이미지 기능을 준비하고 있어요.", code: "NOT_READY" }, { status: 503 });
    let balance: number | null = null;
    if (aiBg) {
      balance = await spendCredits(user.id, IMAGE_COST, "image");
      if (balance === null) return NextResponse.json({ error: "크레딧이 부족해요.", code: "NO_CREDITS" }, { status: 402 });
    }
    try {
      let brandName = "";
      // ★글이 속한 블로그의 이름(실측: '첫 블로그' 조회라 박카 썸네일에 경제 이름) — articleId 기반이 가장 확실
      try {
        if (articleId) {
          const { data: art } = await supabase.from("articles").select("blog_id").eq("id", articleId).eq("user_id", user.id).single();
          if (art?.blog_id) {
            const { data: bp } = await supabase.from("blog_profiles").select("blog_name").eq("id", art.blog_id).single();
            brandName = (bp?.blog_name ?? "").trim();
          }
        }
        if (!brandName) { const { data: bp2 } = await supabase.from("blog_profiles").select("blog_name").eq("user_id", user.id).order("created_at", { ascending: true }).limit(1).single(); brandName = (bp2?.blog_name ?? "").trim(); }
      } catch { /* ignore */ }
      const FONT_ALLOW = ["GmarketSansBold", "BlackHanSans", "Pretendard-Black", "Jua"];
      const fontTitle = FONT_ALLOW.includes(String(body.fontName)) ? String(body.fontName) : "GmarketSansBold";
      const { png, usedAiBackground, aiFailReason } = await composeThumbnail({
        userId: user.id,
        thumb: { mainCopy: breakThumbCopy(mainRaw), subCopy: "", badge: "" },
        articleId: articleId ?? mainRaw,
        useAiBackground: aiBg,
        customBgDataUrl: customBg,
        paletteName,
        bgWash: wash,
        fontTitle,
        topicHint: title || mainRaw, // 글 제목 우선 — 배경이 주제를 그린다
        bgStyle: body.bgStyle === "toss" ? "toss" : "photo", // ★메이커 기본=실사(유저 확정)
        centerCopy: false,
        press: { brandName: brandName || String(body.brandName ?? "").trim() || "MY BLOG" }, // ★전 배경 공통 보도형(유저 확정: 3D도 좌하단 — 앨범 레이아웃 통일)
      });
      // AI 배경 실패로 코드 폴백됐으면 과금 취소(받은 것만 청구)
      if (aiBg && !usedAiBackground) { await addCredits(user.id, IMAGE_COST, "refund_image", crypto.randomUUID()).catch(() => null); }
      const url = await uploadPng(user.id, png);
      if (url && articleId && slotIdx !== null) {
        try {
          const { data: cur } = await supabase.from("articles").select("images").eq("id", articleId).eq("user_id", user.id).single();
          const merged = { ...((cur?.images as Record<string, string>) ?? {}), [String(slotIdx)]: url };
          await supabase.from("articles").update({ images: merged }).eq("id", articleId).eq("user_id", user.id);
        } catch { /* 컬럼 미적용 */ }
      }
      void logUsage({ userId: user.id, model: "thumb", kind: "thumb_maker", inputTokens: 0, outputTokens: aiBg && usedAiBackground ? 1290 : 0 });
      return NextResponse.json({ ok: true, url, dataUrl: url ? undefined : `data:image/png;base64,${png.toString("base64")}`, usedAiBackground, aiFailReason, credits: balance ?? undefined });
    } catch {
      if (aiBg) await addCredits(user.id, IMAGE_COST, "refund_image", refundKeyTM(user.id, mainRaw)).catch(() => null);
      return NextResponse.json({ error: "썸네일을 만들지 못했어요. 크레딧은 돌려드렸어요." }, { status: 502 });
    }
  }

  // ★대표이미지(슬롯0) + 합성 카피 있으면 = v4 코드 합성. 무료(AI 없음·크레딧 0) → 이중차감 구조적 불가.
  const tc = body.thumbCopy;
  const thumbCopy = (tc && typeof tc === "object")
    ? { mainCopy: String(tc.mainCopy ?? "").slice(0, 40), subCopy: String(tc.subCopy ?? "").slice(0, 30), badge: String(tc.badge ?? "").slice(0, 20) }
    : null;
  if (thumbnail && thumbCopy && AI_IMAGES_ENABLED) {
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

  // ★AI 봉인 — 본문 AI 이미지 생성 오프(과금 전 차단). 데이터 카드·업로드는 위에서 처리됨.
  if (!AI_IMAGES_ENABLED) return NextResponse.json({ error: "지금은 직접 찍은 사진을 올리는 방식이에요.", code: "AI_OFF" }, { status: 403 });

  // 본문 이미지(또는 카피 없는 대표) — 유료 Gemini. 선차감(원자적) — 부족하면 402
  const balance = await spendCredits(user.id, IMAGE_COST, "image");
  if (balance === null) return NextResponse.json({ error: "크레딧이 부족해요.", code: "NO_CREDITS" }, { status: 402 });

  const refundRef = crypto.randomUUID();
  try {
    // ★은유 극화 — 이 슬롯이 놓인 자리의 앞 문단(메시지)을 추출해 이미지에 물린다(유저: 이미지는 문단의 포인트를 그려야)
    let paraContext = "";
    try {
      if (articleId && slotIdx !== null) {
        const { data: artRow } = await supabase.from("articles").select("content").eq("id", articleId).eq("user_id", user.id).single();
        const html = String(artRow?.content ?? "");
        const parts = html.split(/\[사진[:\s]/);
        if (parts.length > slotIdx) {
          const before = parts[slotIdx] ?? "";
          paraContext = before.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(-300); // 슬롯 직전 300자
        }
      }
    } catch { /* 없어도 무해 */ }
    const img = await generateBlogImage(slot, title, user.id, { thumbnail, context: paraContext });
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
    return NextResponse.json({ ok: true, url, dataUrl: url ? undefined : `data:${img.mime};base64,${img.base64}`, credits: balance, provider: (img as { provider?: string }).provider });
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
