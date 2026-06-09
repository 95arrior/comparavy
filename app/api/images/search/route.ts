import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { ensureUserRow } from "@/lib/userPlan";

/** 한국어 주제를 스톡 사진 검색용 영어 키워드로 (haiku, 실패 시 원문 사용) */
async function toEnglishQuery(korean: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return korean;
  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 30,
      messages: [
        {
          role: "user",
          content:
            "Give 1-3 English keywords (space-separated, no punctuation) to search a stock photo site for this Korean blog topic. Output only the keywords.\n\n" +
            korean,
        },
      ],
    });
    const t = res.content.find((b) => b.type === "text");
    const out = t && t.type === "text" ? t.text.trim().replace(/[\n".]/g, " ").trim() : "";
    return out || korean;
  } catch {
    return korean;
  }
}

/** Pexels에서 대표이미지 후보(가로형)를 검색해 돌려준다. (프로 전용) */
export async function GET(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 완료되지 않았습니다." }, { status: 500 });
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const planRow = await ensureUserRow(supabase, user.id);
  if (planRow.plan !== "pro") {
    return NextResponse.json({ error: "이미지 추천은 프로 플랜 기능이에요.", upgrade: true }, { status: 403 });
  }

  const key = process.env.PEXELS_API_KEY;
  if (!key) return NextResponse.json({ images: [], needsKey: true });

  const query = new URL(request.url).searchParams.get("query")?.trim() || "";
  if (!query) return NextResponse.json({ images: [] });

  try {
    const en = await toEnglishQuery(query);
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(en)}&per_page=12&orientation=landscape`,
      { headers: { Authorization: key } },
    );
    if (!res.ok) return NextResponse.json({ images: [] });
    const data = (await res.json()) as {
      photos: { src: { medium: string; landscape: string; large2x: string }; alt: string }[];
    };
    const images = (data.photos || []).map((p) => ({
      thumb: p.src.medium,
      full: p.src.landscape || p.src.large2x,
      alt: p.alt || query,
    }));
    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ images: [] });
  }
}
