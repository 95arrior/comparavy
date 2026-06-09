import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { ensureUserRow } from "@/lib/userPlan";
import { logUsage } from "@/lib/usageLog";
import { checkRateLimit } from "@/lib/rateLimit";

/**
 * 글 내용(제목+본문)을 분석해 SEO 태그 3~5개를 추천한다. (싼 모델 haiku 사용, 프로 전용)
 * 기존 글(태그 없이 만든 글)에도 태그를 붙일 수 있게 한다.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 완료되지 않았습니다." }, { status: 500 });
  }
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const planRow = await ensureUserRow(supabase, user.id);
  if (planRow.plan !== "pro") {
    return NextResponse.json({ error: "태그 추천은 프로 플랜 기능이에요.", upgrade: true }, { status: 403 });
  }

  const rl = await checkRateLimit(supabase, user.id, "tag_suggest", 12, 300);
  if (!rl.ok) {
    return NextResponse.json({ error: `추천이 너무 잦아요. ${rl.retryAfterSec ?? 60}초 후 다시 시도해 주세요.` }, { status: 429 });
  }

  const { data: article } = await supabase
    .from("articles")
    .select("title, body_html, keyword")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!article) return NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI 설정이 완료되지 않았습니다." }, { status: 500 });

  const plain = (article.body_html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2500);

  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content:
            "다음 한국어 블로그 글에 맞는 워드프레스 태그 3~5개를 추천해줘.\n" +
            "규칙: ① 여러 글에 다시 쓸 수 있는 재사용 가능한 주제어(너무 좁은 말 금지) ② 한국어 명사형 ③ 글 제목 복붙·문장형 금지 ④ '정보·일상' 같은 막연한 말 금지 ⑤ 사람들이 실제로 검색·탐색하는 말.\n" +
            "출력은 JSON 배열만. 예: [\"강아지 분리불안\",\"실내 훈련\",\"반려견 행동\"]\n\n" +
            `제목: ${article.title}\n키워드: ${article.keyword ?? ""}\n본문: ${plain}`,
        },
      ],
    });
    void logUsage({ userId: user.id, model: "claude-haiku-4-5", kind: "tag_suggest", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
    const text = res.content.find((b) => b.type === "text");
    const raw = text && text.type === "text" ? text.text : "[]";
    const match = raw.match(/\[[\s\S]*\]/);
    let tags: string[] = [];
    if (match) {
      try {
        const arr = JSON.parse(match[0]);
        if (Array.isArray(arr)) {
          const seen = new Set<string>();
          tags = arr
            .filter((t): t is string => typeof t === "string")
            .map((t) => t.trim().replace(/^#/, "").slice(0, 30))
            .filter((t) => t && !seen.has(t) && seen.add(t))
            .slice(0, 5);
        }
      } catch {
        // 파싱 실패 → 빈 배열
      }
    }
    return NextResponse.json({ tags });
  } catch {
    return NextResponse.json({ error: "태그 추천에 실패했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
