import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { formatBody, countPhotoSlots, hasPhotoLeak } from "@/lib/publishHtml";
import { extractUrls, VERIFIED_LINKS } from "@/lib/linkWhitelist";

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

  const url0 = new URL(request.url);
  // ?list=1 → 최근 글 id·제목 10개(어떤 id를 넣을지 확인용)
  if (url0.searchParams.get("list") === "1") {
    const { data: rows } = await supabase.from("articles").select("id, title, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
    return NextResponse.json({ count: rows?.length ?? 0, articles: (rows ?? []).map((r) => ({ id: r.id, title: r.title, status: r.status, created_at: r.created_at })) }, { headers: { "cache-control": "no-store" } });
  }
  // ?urls=1 → 기존 글 전수 URL 스캔: 사전 밖 URL 목록(발행물 수동 수정용)
  if (url0.searchParams.get("urls") === "1") {
    const { data: arts } = await supabase.from("articles").select("id, title, status, body_html").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    const wl = Object.keys(VERIFIED_LINKS);
    const offenders: { id: string; title: string; status: string; urls: string[] }[] = [];
    for (const a of arts ?? []) {
      const urls = extractUrls(String(a.body_html ?? ""));
      const bad = urls.filter((u) => { const d = u.replace(/^https?:\/\//i, "").replace(/^www\./, "").split("/")[0].toLowerCase(); return !wl.some((k) => d === k || d.endsWith("." + k)); });
      if (bad.length) offenders.push({ id: a.id, title: a.title, status: a.status, urls: [...new Set(bad)].slice(0, 10) });
    }
    return NextResponse.json({ scanned: arts?.length ?? 0, offenders }, { headers: { "cache-control": "no-store" } });
  }
  const id = url0.searchParams.get("id");
  let q = supabase.from("articles").select("id, title, body_html, images, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
  if (id) q = supabase.from("articles").select("id, title, body_html, images, created_at").eq("user_id", user.id).eq("id", id).limit(1);
  const { data } = await q;
  const art = data?.[0];
  if (!art) return NextResponse.json({ error: "글 없음(id 확인 또는 발행글 필요)" }, { status: 404 });

  const body = String(art.body_html ?? "");
  const published = formatBody({ title: art.title ?? "", bodyHtml: body }); // 발행 실제 HTML(정렬·데이터박스·분할 적용)

  // ① 문단 줄 수
  // 산문 문단만 4줄 검사 — 데이터박스(<div ...>) 안의 블록은 제외
  const proseHtml = published.replace(/<div[^>]*>[\s\S]*?<\/div>/gi, "");
  const paras = [...proseHtml.matchAll(/<(p|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((m) => m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const paraLines = paras.map((t) => ({ preview: t.slice(0, 24), lines: Math.max(1, Math.ceil(t.length / CHARS_PER_LINE)) }));
  const over = paraLines.filter((p) => p.lines > MAX_LINES);

  // ② 정렬 커버리지 — 발행 HTML(buildRichHtml)의 전 블록에 text-align 있는지
  // 전 블록(div 데이터박스 포함)이 정렬(center 또는 left) 명시됐는지. li는 부모(ul/div) 정렬 상속이라 제외.
  const blocks = [...published.matchAll(/<(p|h1|h2|h3|h4|blockquote|ul|ol|div)(\s[^>]*)?>/gi)];
  const noAlign = blocks.filter((b) => !/text-align:left/i.test(b[0]));
  const centerBlocks = blocks.filter((b) => /text-align:center/i.test(b[0])).length; // left 동결 — center는 0이어야

  // ③ 발행 안전성 — 원인 분류(마커 수 vs 이미지 수) + 유출 0 증명
  const markerCount = countPhotoSlots(body);
  const imgMap = (art.images && typeof art.images === "object") ? (art.images as Record<string, string>) : {};
  const imageCount = Object.values(imgMap).filter(Boolean).length;
  const richWithImgs = formatBody({ title: art.title ?? "", bodyHtml: body, images: Object.fromEntries(Object.entries(imgMap).map(([k, v]) => [Number(k), v])) });
  const proseP = [...richWithImgs.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => m[1]);
  const brokenParen = proseP.filter((p) => (p.match(/[(（]/g) ?? []).length !== (p.match(/[)）]/g) ?? []).length).length;
  const emojiHit = (richWithImgs.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu) ?? []).length;

  return NextResponse.json({
    build_marker: "publish-safety-v1",
    article: { id: art.id, title: art.title, created_at: art.created_at },
    publish_safety: {
      marker_count: markerCount,       // 본문 [사진:] 마커 수
      image_count: imageCount,         // 실제 생성 이미지 레코드 수
      slot_image_synced: markerCount <= 3 && imageCount <= markerCount, // 슬롯≤3 & 이미지≤마커
      photo_leak: hasPhotoLeak(richWithImgs), // 발행 HTML에 [사진/지시 잔존?
      emoji_count: emojiHit,           // 발행 HTML 이모지 수
      broken_paren_paragraphs: brokenParen, // 미닫힌 괄호로 쪼개진 문단 수
      pass: !hasPhotoLeak(richWithImgs) && emojiHit === 0 && brokenParen === 0,
    },
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
      missing_align_left: noAlign.length,
      center_blocks: centerBlocks,
      pass: noAlign.length === 0 && centerBlocks === 0,
      missing_sample: noAlign.slice(0, 5).map((b) => b[0]),
    },
  }, { headers: { "cache-control": "no-store" } });
}
