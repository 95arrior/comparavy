import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { AUDIENCE_ALL } from "@/lib/audience";

// '우리 가게 글'(소개·어필) 빠른 시작 프리셋 — 업종마다 AI가 자동 생성.
// 목적: 검색 유입이 아니라, 글을 보고 '온 사람'에게 우리 가게를 어필·소개·신뢰. 사장님이 진짜 쓰는 글 종류.
export interface BizPreset {
  label: string; // 칩 글자(8자 내외)
  emoji: string;
  hint: string; // 입력창 가이드 placeholder — 사장님이 뭘 적으면 되는지(대괄호 없이 자연스럽게)
}

interface CacheEntry { at: number; presets: BizPreset[] }
const cache = new Map<string, CacheEntry>();
const TTL = 1000 * 60 * 60 * 24; // 하루

const FALLBACK: BizPreset[] = [
  { label: "우리 가게 소개", emoji: "🏪", hint: "우리 가게가 어떤 곳인지, 가장 큰 강점, 어떤 손님에게 좋은지 편하게 적어주세요" },
  { label: "이렇게 운영해요", emoji: "🛎️", hint: "우리가 일하는 방식·하루 흐름·신경 쓰는 점을 편하게 적어주세요" },
  { label: "자주 묻는 것", emoji: "❓", hint: "손님이 자주 묻는 질문과 그에 대한 답을 편하게 적어주세요" },
  { label: "사장 이야기", emoji: "🙋", hint: "왜 이 일을 시작했는지, 어떤 마음으로 하는지 편하게 적어주세요" },
];

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ presets: [] });

  const { data: profile } = await supabase
    .from("blog_profiles")
    .select("vertical, sub_category, audience, biz_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const vertical = profile?.vertical;
  if (!vertical) return NextResponse.json({ presets: [] });
  const sub = profile?.sub_category as string | undefined;
  const audArr: string[] = Array.isArray(profile?.audience) ? (profile!.audience as string[]) : [];
  const aud = audArr.filter((a) => a !== AUDIENCE_ALL).join("·") || undefined;
  const field = sub || vertical;

  const key = `${field}|${aud ?? ""}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json({ presets: hit.presets });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ presets: FALLBACK });

  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content:
            `업장: ${field}${aud ? ` / 대상: ${aud}` : ""}\n` +
            "이 업장 사장님이 블로그에 쓸 만한 '우리 가게 소개·어필 글' 종류를 6개 만들어줘.\n" +
            "★목적: 검색 유입이 아니라, 글을 보고 '온 사람'에게 우리 가게를 어필·소개하고 신뢰를 주는 글. 사장님이 진짜 쓰고 싶어 하는 글 종류.\n" +
            "★이 업종에 '딱 맞게'(예: 학원=커리큘럼·수업후기·원장 인사말 / 식당=신메뉴·매장 분위기·사장 이야기 / 미용실=시술 소개·우리 원장·전후).\n" +
            "각 항목:\n" +
            "• label = 칩에 들어갈 짧은 글자(공백 포함 8자 내외, 친근하게).\n" +
            "• emoji = 어울리는 이모지 1개.\n" +
            "• hint = 사장님이 입력창에 '뭘 적으면 되는지' 안내하는 한 문장(대괄호·빈칸 없이 자연스럽게, '~를 편하게 적어주세요'체).\n" +
            'JSON 배열로만: [{"label":"우리 학원 소개","emoji":"🏫","hint":"우리 학원이 어떤 곳인지, 강점, 어떤 아이에게 좋은지 편하게 적어주세요"}, ...] (6개)',
        },
      ],
    });
    const text = res.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    const m = text.match(/\[[\s\S]*\]/);
    const arr = m ? (JSON.parse(m[0]) as unknown[]) : [];
    const presets: BizPreset[] = arr
      .map((o) => o as { label?: unknown; emoji?: unknown; hint?: unknown })
      .filter((o) => typeof o.label === "string" && typeof o.hint === "string")
      .map((o) => ({ label: String(o.label).trim().slice(0, 14), emoji: typeof o.emoji === "string" ? o.emoji : "✏️", hint: String(o.hint).trim() }))
      .slice(0, 6);
    const out = presets.length >= 3 ? presets : FALLBACK;
    cache.set(key, { at: Date.now(), presets: out });
    return NextResponse.json({ presets: out });
  } catch {
    return NextResponse.json({ presets: FALLBACK });
  }
}
