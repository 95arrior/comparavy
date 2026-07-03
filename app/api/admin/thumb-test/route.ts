import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { composeThumbnail } from "@/lib/composeThumbnail";

export const maxDuration = 60;

// ★관리자 전용 — Vercel에서 composeThumbnail 실렌더 검증(satori/resvg 바이너리 + 한글 폰트 번들 확인).
//  기본은 코드 배경(AI 없음 = 무료·크레딧 0). ?ai=1이면 AI 배경 1장(Gemini) 테스트.
//  ?copy=... 로 카피 지정. 함수 사이즈·콜드스타트는 Vercel 로그로, 렌더 소요는 응답 renderMs로.
export async function GET(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: "관리자만" }, { status: 403 });

  const url = new URL(request.url);
  const useAi = url.searchParams.get("ai") === "1";
  const mainCopy = (url.searchParams.get("copy") || "지금 바꿔야\n하는 이유").replace(/\\n/g, "\n").slice(0, 24);
  const seedU = url.searchParams.get("u") || user.id;

  const t0 = Date.now();
  let png: Buffer, usedAiBackground = false, err: string | null = null;
  try {
    const r = await composeThumbnail({ userId: seedU, thumb: { mainCopy, subCopy: "지금부터 준비하는 법", badge: "경제·재테크" }, useAiBackground: useAi });
    png = r.png; usedAiBackground = r.usedAiBackground;
  } catch (e) {
    err = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return NextResponse.json({ ok: false, renderFailed: true, error: err, renderMs: Date.now() - t0 }, { status: 500 });
  }
  const renderMs = Date.now() - t0;

  // 업로드해서 URL 반환(브라우저에서 바로 보기)
  let publicUrl: string | null = null;
  try {
    const admin = createSupabaseAdminClient();
    try { await admin.storage.createBucket("ai-images", { public: true }); } catch { /* 있음 */ }
    const path = `${user.id}/thumbtest-${crypto.randomUUID()}.png`;
    const { error: upErr } = await admin.storage.from("ai-images").upload(path, png, { contentType: "image/png" });
    if (!upErr) publicUrl = admin.storage.from("ai-images").getPublicUrl(path).data.publicUrl;
  } catch { /* 폴백: dataUrl */ }

  return NextResponse.json({
    ok: true, renderMs, usedAiBackground, requestedAi: useAi,
    note: usedAiBackground ? "AI 배경 사용" : (useAi ? "AI 배경 실패→코드 폴백(정상)" : "코드 배경(무료)"),
    url: publicUrl, dataUrl: publicUrl ? undefined : `data:image/png;base64,${png.toString("base64").slice(0, 80)}...(생략)`,
  });
}
