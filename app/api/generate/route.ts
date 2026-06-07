import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { ensureUserRow, rolloverIfNeeded } from "@/lib/userPlan";
import { PLANS } from "@/lib/plans";
import { generateArticle } from "@/lib/generateArticle";
import { countKoreanChars } from "@/lib/humanizer";

export const maxDuration = 300;

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 완료되지 않았습니다." }, { status: 500 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: {
    keyword?: string;
    angle?: string;
    type?: string;
    tone?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const keyword = (body.keyword ?? "").trim();
  if (!keyword) {
    return NextResponse.json({ error: "키워드를 입력해 주세요." }, { status: 400 });
  }

  // 플랜·사용량 확인
  let row = await ensureUserRow(supabase, user.id);
  row = await rolloverIfNeeded(supabase, row);

  if (row.articles_used >= row.articles_limit) {
    return NextResponse.json(
      { error: "이번 달 생성 한도를 모두 사용했습니다. 프로로 업그레이드하면 더 많이 생성할 수 있습니다." },
      { status: 403 },
    );
  }

  const maxWords = PLANS[row.plan].maxWords;
  const type = body.type ?? "howto";
  const tone = body.tone ?? "friendly";

  // 글 생성
  let article;
  try {
    article = await generateArticle({ keyword, angle: body.angle, type, tone, maxWords });
  } catch (err) {
    const message = err instanceof Error ? err.message : "글 생성 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // 길이 검증 (목표 글자수의 절반 미만이면 너무 짧음)
  const charCount = countKoreanChars(article.body_html);
  if (charCount < maxWords * 0.5) {
    return NextResponse.json(
      { error: "생성된 글이 너무 짧습니다. 다시 시도해 주세요." },
      { status: 502 },
    );
  }

  // 저장 + 사용량 증가
  const { data: saved, error: saveError } = await supabase
    .from("articles")
    .insert({
      user_id: user.id,
      keyword,
      title: article.title,
      meta_title: article.meta_title,
      meta_description: article.meta_description,
      body_html: article.body_html,
      faq: article.faq,
      char_count: charCount,
      status: "draft",
    })
    .select("*")
    .single();

  if (saveError) {
    return NextResponse.json({ error: "글을 저장하지 못했습니다." }, { status: 500 });
  }

  await supabase
    .from("users")
    .update({ articles_used: row.articles_used + 1 })
    .eq("id", user.id);

  return NextResponse.json({ article: saved });
}
