import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import Anthropic from "@anthropic-ai/sdk";
import { getCache, setCache, TTL_WEEK } from "@/lib/apiCache";

// 주제 시리즈 — 한 핵심 주제를 깊이 파는 '연재 코스'(8편). 한 분야 집중 = 네이버 C-Rank '전문 블로그' 인식 가속.
// AI로 논리적 순서(입문→심화) 기획. graceful: 실패/미설정이면 빈 배열.

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ items: [] });

  const { data: profile } = await supabase
    .from("blog_profiles")
    .select("vertical, sub_category, audience")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile?.vertical) return NextResponse.json({ items: [] });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ items: [] });

  const field = ((profile.sub_category as string | null) || (profile.vertical as string)).replace(/·/g, " ").trim();
  const aud = Array.isArray(profile.audience) ? (profile.audience as string[]).filter((a) => a && a !== "전체").join("·") : "";

  // 캐시(유저+분야 7일) — 시리즈는 잘 안 바뀜. AI 호출 절감
  const cacheKey = `series:${user.id}:${field}:${aud}`;
  const cached = await getCache<{ theme: string; items: { title: string; keyword: string }[] }>(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 700,
      messages: [
        {
          role: "user",
          content:
            `'${field}' 분야${aud ? ` (대상: ${aud})` : ""} 블로그가 '이 분야 전문 블로그'로 네이버·구글에 빠르게 인식되도록, ` +
            "하나의 핵심 주제를 깊이 파고드는 '연재 시리즈' 글 8편을 논리적 순서(입문 → 심화)로 기획해줘.\n" +
            "- 8편이 하나의 좁은 주제로 이어져 '전문성'이 쌓이게(중구난방 X). 서로 겹치지 않게.\n" +
            "- 각 편은 그 분야 사람들이 실제 검색하는 구체 주제. 제목은 네이버에서 자연스럽게 검색·클릭될 형태(과장·낚시·대괄호 금지).\n" +
            "- 각 편의 핵심 키워드(2~4어절)도 함께.\n" +
            'JSON으로만 답: {"theme":"시리즈 주제 한 줄","items":[{"title":"제목","keyword":"키워드"}, ...]}',
        },
      ],
    });
    const text = res.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    const m = text.match(/\{[\s\S]*\}/);
    const j = m ? (JSON.parse(m[0]) as { theme?: unknown; items?: unknown[] }) : {};
    const items = Array.isArray(j.items)
      ? j.items
          .filter((x): x is { title: string; keyword: string } => {
            const o = x as { title?: unknown; keyword?: unknown };
            return typeof o?.title === "string" && typeof o?.keyword === "string" && o.title.trim().length > 0;
          })
          .map((x) => ({ title: x.title.trim(), keyword: x.keyword.trim() }))
          .slice(0, 8)
      : [];
    const result = { theme: typeof j.theme === "string" ? j.theme : "", items };
    if (items.length) await setCache(cacheKey, result, TTL_WEEK);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ items: [] });
  }
}
