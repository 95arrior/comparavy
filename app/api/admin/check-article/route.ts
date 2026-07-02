import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { buildRichHtml } from "@/lib/publishHtml";

export const dynamic = "force-dynamic";

// 관리자 검증 — 특정 글의 모바일 포맷을 390px 기준으로 검사. ?id=<articleId> 또는 최신 발행글.
//  ①문단 줄 수(4줄 초과 0개) ②정렬 커버리지(전 블록 text-align 적용 0 누락).
const CHARS_PER_LINE = 23; // 390px 프레임(본문폭 ~350px, 15px 한글) 기준
const MAX_LINES = 4;

export async function GET(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: "관리자만" }, { status: 403 });

  const id = new URL(request.url).searchParams.get("id");
  let q = supabase.from("articles").select("id, title, body_html, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
  if (id) q = supabase.from("articles").select("id, title, body_html, created_at").eq("user_id", user.id).eq("id", id).limit(1);
  const { data } = await q;
  const art = data?.[0];
  if (!art) return NextResponse.json({ error: "글 없음(id 확인 또는 발행글 필요)" }, { status: 404 });

  const body = String(art.body_html ?? "");

  // ① 문단 줄 수
  const paras = [...body.matchAll(/<(p|li|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((m) => m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const paraLines = paras.map((t) => ({ preview: t.slice(0, 24), lines: Math.max(1, Math.ceil(t.length / CHARS_PER_LINE)) }));
  const over = paraLines.filter((p) => p.lines > MAX_LINES);

  // ② 정렬 커버리지 — 발행 HTML(buildRichHtml)의 전 블록에 text-align 있는지
  const rich = buildRichHtml({ title: art.title ?? "", bodyHtml: body });
  const blocks = [...rich.matchAll(/<(p|h1|h2|h3|h4|blockquote|li|ul|ol)(\s[^>]*)?>/gi)];
  const noAlign = blocks.filter((b) => !/text-align:center/i.test(b[0]));

  return NextResponse.json({
    article: { id: art.id, title: art.title, created_at: art.created_at },
    mobile_390px: {
      max_lines_threshold: MAX_LINES,
      paragraphs: paras.length,
      over_4_lines: over.length,
      over_detail: over,
      pass: over.length === 0,
      all_paragraphs: paraLines,
    },
    alignment: {
      total_blocks: blocks.length,
      missing_align: noAlign.length,
      pass: noAlign.length === 0,
      missing_sample: noAlign.slice(0, 5).map((b) => b[0]),
    },
  }, { headers: { "cache-control": "no-store" } });
}
