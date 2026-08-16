import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rateLimit";
import { designThumbScene } from "@/lib/thumbScene";
import { buildThumbPromptFromDesign, buildThumbImagePrompt } from "@/lib/imagePrompts";

export const maxDuration = 60;

// ★썸네일 장면 설계 프롬프트(2026-08-17 v4 — 유저: "직장인 세금 폭탄 띠별인데 관련된 게 하나도 없는데").
//  글 제목·키워드를 모델에 주고 주제 앵커가 박힌 장면을 설계 → 하드 규칙(여백·금지)은 코드가 조립.
//  설계 실패 시 정규식 폴백(v3) — 빈손은 없다.
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const rl = await checkRateLimit(supabase, user.id, "thumb_prompt", 40, 3600);
  if (!rl.ok) return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  const articleId = typeof body.articleId === "string" ? body.articleId.slice(0, 60) : "";
  const roll = Number.isFinite(body.roll) ? Math.max(0, Math.floor(Number(body.roll))) : 0; // 리롤 회차 — 색 무드 로테이션
  if (!articleId) return NextResponse.json({ error: "글을 알 수 없어요." }, { status: 400 });
  const { data: art } = await supabase.from("articles").select("title, keyword, selection_meta").eq("id", articleId).eq("user_id", user.id).maybeSingle();
  if (!art) return NextResponse.json({ error: "글을 찾을 수 없어요." }, { status: 404 });

  const sm = (art.selection_meta ?? {}) as { mrAngle?: string; species?: string };
  const lane: "home" | "search" = sm.mrAngle === "homefeed" || sm.species === "homefeed" ? "home" : "search";
  const keyword = String(art.keyword ?? art.title ?? "");
  const design = await designThumbScene(String(art.title ?? keyword), keyword, lane, user.id);
  const prompt = design
    ? buildThumbPromptFromDesign(design, keyword, lane, `${articleId}:${roll}`)
    : buildThumbImagePrompt(String(art.title ?? keyword), null, lane, `${articleId}:${roll}`); // 폴백 — v3 정규식 엔진
  return NextResponse.json({ prompt, designed: Boolean(design), lane });
}
