import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { spendCredits, addCredits } from "@/lib/credits";
import { IMAGE_COST } from "@/lib/creditPacks";
import { generateBlogImage, imageReady, GEMINI_IMAGE_MODEL } from "@/lib/geminiImage";
import { logUsage } from "@/lib/usageLog";

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
  if (!slot) return NextResponse.json({ error: "어떤 이미지가 필요한지 알 수 없어요." }, { status: 400 });

  // 선차감(원자적) — 부족하면 402
  const balance = await spendCredits(user.id, IMAGE_COST, "image");
  if (balance === null) return NextResponse.json({ error: "크레딧이 부족해요.", code: "NO_CREDITS" }, { status: 402 });

  const refundRef = crypto.randomUUID();
  try {
    const img = await generateBlogImage(slot, title);
    void logUsage({ userId: user.id, model: GEMINI_IMAGE_MODEL, kind: "image", inputTokens: 0, outputTokens: 1290 });
    return NextResponse.json({ ok: true, dataUrl: `data:${img.mime};base64,${img.base64}`, credits: balance });
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
