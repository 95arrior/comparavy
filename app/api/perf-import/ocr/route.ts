// ★유입 검색어 스크린샷 읽기(2026-08-05 유저: "이미지 넣고 싶은데 못 넣게 되어 있는데?").
//
//  왜 이미지인가: 크리에이터 어드바이저 표는 드래그 복사가 잘 안 되는 화면이 많다.
//   특히 모바일에서는 사실상 스크린샷밖에 방법이 없다 — 매일 넣어야 하는 자료인데
//   입력이 번거로우면 안 넣게 되고, 안 넣으면 적중률은 영원히 안 나온다.
//
//  ★그런데 이건 적중률의 '재료'다. 잘못 읽으면 지표가 조용히 거짓말을 한다.
//   유저가 "글감 박스에 절대 거짓이 있으면 안 된다"고 한 원칙이 여기에도 그대로 적용된다.
//   그래서 이 API는 저장하지 않는다 — 읽기만 하고 돌려준다.
//   저장은 유저가 눈으로 확인하고 '기록하기'를 누를 때만 일어난다(기존 경로 그대로).
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logUsage } from "@/lib/usageLog";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 6 * 1024 * 1024; // 6MB — 스크린샷은 보통 1MB 미만이다
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export interface OcrRow { keyword: string; inflow: number }

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "이미지 읽기를 지금 쓸 수 없어요. 표를 붙여넣어 주세요." }, { status: 503 });

  let body: { image?: string; mime?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "이미지를 못 받았어요." }, { status: 400 }); }

  const base64 = String(body.image ?? "").replace(/^data:[^;]+;base64,/, "");
  const mime = String(body.mime ?? "image/png");
  if (!base64) return NextResponse.json({ error: "이미지를 못 받았어요." }, { status: 400 });
  if (!ALLOWED.has(mime)) return NextResponse.json({ error: "PNG·JPG 이미지만 읽을 수 있어요." }, { status: 400 });
  // base64는 원본보다 약 1/3 크다
  if (base64.length * 0.75 > MAX_BYTES) return NextResponse.json({ error: "이미지가 너무 커요. 화면을 잘라서 다시 올려주세요." }, { status: 413 });

  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1400,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: mime as "image/png", data: base64 } },
        { type: "text", text: [
          "이 이미지는 네이버 크리에이터 어드바이저의 '유입 검색어' 화면이다.",
          "표에 보이는 검색어와 그 유입수(조회수)를 그대로 읽어라.",
          "★규칙:",
          "- 이미지에 실제로 보이는 것만 적는다. 안 보이거나 잘린 값은 지어내지 마라.",
          "- 순위 번호·퍼센트·증감 화살표는 빼고, 검색어와 유입수만 남긴다.",
          "- 유입수가 안 보이면 0으로 둔다(추측 금지).",
          "- 검색어는 띄어쓰기까지 화면 그대로.",
          "- 표가 아니거나 유입 검색어 화면이 아니면 rows를 빈 배열로 두고 note에 무엇이 보이는지 한 줄로 적는다.",
          'JSON만 출력: {"rows":[{"keyword":"...","inflow":0}],"note":"짧게"}',
        ].join("\n") },
      ] }],
    });
    void logUsage({ userId: user.id, model: "claude-haiku-4-5", kind: "inflow_ocr", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });

    const raw = res.content[0]?.type === "text" ? res.content[0].text : "";
    const m = /\{[\s\S]*\}/.exec(raw);
    if (!m) return NextResponse.json({ rows: [], note: "표를 못 읽었어요. 화면을 더 크게 잘라서 올려보세요." });
    const parsed = JSON.parse(m[0]) as { rows?: { keyword?: string; inflow?: number | string }[]; note?: string };

    const rows: OcrRow[] = (parsed.rows ?? [])
      .map((r) => ({
        keyword: String(r.keyword ?? "").trim().slice(0, 60),
        // "1,234" 같은 표기를 숫자로. 못 읽으면 0(추측하지 않는다)
        inflow: Math.max(0, Math.round(Number(String(r.inflow ?? 0).replace(/[^\d.]/g, "")) || 0)),
      }))
      .filter((r) => r.keyword.length >= 2)
      .filter((r, i, a) => a.findIndex((x) => x.keyword === r.keyword) === i)
      .slice(0, 100);

    return NextResponse.json({ rows, note: String(parsed.note ?? "").slice(0, 120) });
  } catch (e) {
    console.error("[inflow-ocr] 실패:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "이미지를 읽지 못했어요. 표를 붙여넣는 방법도 그대로 쓸 수 있어요." }, { status: 502 });
  }
}
