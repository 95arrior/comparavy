import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { composeThumbnail } from "@/lib/composeThumbnail";

// ★180초(2026-08-01) — 배경 생성이 1회 35초대라 재시도까지 가면 70초가 넘어 60초 제한에 걸렸다.
//  실측: 1차 성공 37초 / 1차 실패 후 재시도하면 시간 초과 → 함수가 죽고 단색 폴백으로 보였다.
//  재시도를 넣은 쪽이 원인이므로 시간을 함께 늘린다.
export const maxDuration = 180;

// ★관리자 전용 — Vercel에서 composeThumbnail 실렌더 검증(satori/resvg 바이너리 + 한글 폰트 번들).
//  PNG를 직접 반환(스토리지 불필요) → 클릭하면 이미지가 바로 보인다. 기본은 코드 배경(무료·크레딧 0).
//   ?ai=1   → AI 배경 1장(Gemini) 테스트
//   ?meta=1 → 이미지 대신 JSON{renderMs, usedAiBackground} 반환(렌더 성공·시간만 확인)
//   ?copy=..&u=..  → 카피/유저시드 지정. 콜드스타트는 Vercel 함수 로그, 렌더 소요는 x-render-ms 헤더.
export async function GET(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: "관리자만" }, { status: 403 });

  const url = new URL(request.url);
  const useAi = url.searchParams.get("ai") === "1";
  const metaOnly = url.searchParams.get("meta") === "1";
  const mainCopy = (url.searchParams.get("copy") || "지금 바꿔야\n하는 이유").replace(/\\n/g, "\n").slice(0, 24);
  const seedU = url.searchParams.get("u") || user.id;
  // ★무문구 실사(2026-08-02) — ?textless=<홈판 유형>으로 조판 없는 이미지 한 장을 실제로 뽑아 본다.
  //  프롬프트가 의도대로 나오는지는 한 장 뽑아 봐야 안다(로컬엔 이미지 키가 없어 여기서만 가능).
  const textlessType = url.searchParams.get("textless");

  const t0 = Date.now();
  try {
    const { png, usedAiBackground, aiFailReason } = await composeThumbnail({
      userId: seedU,
      thumb: { mainCopy, subCopy: "지금부터 준비하는 법", badge: "경제·재테크" },
      articleId: url.searchParams.get("a") || null, // 글마다 포즈 변주 데모
      useAiBackground: useAi,
      textless: textlessType ? { betType: textlessType } : undefined,
    });
    const renderMs = Date.now() - t0;
    if (metaOnly) {
      return NextResponse.json({
        ok: true, renderMs, usedAiBackground, requestedAi: useAi,
        // ★실패 이유를 그대로 돌려준다(2026-08-01) — '폴백됐다'만 알면 원인을 못 찾는다.
        aiFailReason: aiFailReason ?? null,
        textless: textlessType ?? null,
        note: usedAiBackground ? "AI 배경 사용" : (useAi ? "AI 배경 실패→코드 폴백" : "코드 배경(무료)"),
      }, { headers: { "cache-control": "no-store" } });
    }
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "content-type": "image/png",
        "cache-control": "no-store",
        "x-render-ms": String(renderMs),
        "x-used-ai-bg": String(usedAiBackground),
      },
    });
  } catch (e) {
    const err = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return NextResponse.json({ ok: false, renderFailed: true, error: err, renderMs: Date.now() - t0 }, { status: 500 });
  }
}
