import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { formatBody, countPhotoSlots, hasPhotoLeak } from "@/lib/publishHtml";
import { BODY_ALIGN } from "@/config/publish";
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
  // ?usage=1 → 최근 7일 usage_log kind별 집계(가드·재생성 발동률 실측용)
  if (url0.searchParams.get("usage") === "1") {
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: logs } = await supabase.from("usage_log").select("kind").gte("created_at", since).limit(5000);
    const freq: Record<string, number> = {};
    for (const r of logs ?? []) freq[r.kind] = (freq[r.kind] ?? 0) + 1;
    const gen = freq["generate"] ?? 0, retry = freq["fabricated_retry"] ?? 0;
    return NextResponse.json({ sinceDays: 7, kinds: freq, fabricatedRetryRate: gen > 0 ? `${retry}/${gen} (${Math.round((retry / Math.max(1, gen)) * 100)}%)` : "표본 없음" }, { headers: { "cache-control": "no-store" } });
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

  // ★원문 읽기 모드(2026-08-02) — ?raw=1. 구조 지표만으로는 문장 흐름·인용구·재미를 판정할 수 없다.
  //  text/plain으로 돌려 줄바꿈이 살아 있게 한다(JSON 한 줄이면 사람이 못 읽는다).
  if (url0.searchParams.get("raw") === "1") {
    const marked = body
      .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n\n### $1\n")
      .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "\n[인용] $1\n")
      .replace(/<table[\s\S]*?<\/table>/gi, "\n[표]\n")
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "· $1\n")
      .replace(/<\/(p|ul|ol|div)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return new NextResponse(`[제목] ${art.title}\n[작성] ${art.created_at}\n\n${marked}`, {
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
  const published = formatBody({ title: art.title ?? "", bodyHtml: body }); // 발행 실제 HTML(정렬·데이터박스·분할 적용)

  // ① 문단 줄 수
  // 산문 문단만 4줄 검사 — 데이터박스(<div ...>) 안의 블록은 제외
  const proseHtml = published.replace(/<div[^>]*>[\s\S]*?<\/div>/gi, "");
  const paras = [...proseHtml.matchAll(/<(p|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((m) => m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const paraLines = paras.map((t) => ({ preview: t.slice(0, 24), lines: Math.max(1, Math.ceil(t.length / CHARS_PER_LINE)) }));
  const over = paraLines.filter((p) => p.lines > MAX_LINES);

  // ② 정렬 커버리지 — ★2026-08-02 수정: 이 검사가 왼쪽 정렬을 기대하고 있어서 항상 실패로 떴다.
  //  본문 정렬은 2026-07-10 유저 A/B 실측으로 '중앙'이 확정됐는데(config/publish BODY_ALIGN) 검사기만 안 고쳤다.
  //  항상 실패하는 검사는 아무 정보도 주지 못하고, 진짜 정렬 사고가 나도 못 잡는다.
  //  이제 설정값을 읽어 그 정렬이 전 블록에 깔렸는지 본다(리스트·표는 좌측 유지가 정상이라 제외).
  const wantAlign = BODY_ALIGN; // "center" | "left"
  const blocks = [...published.matchAll(/<(p|h1|h2|h3|h4|blockquote)(\s[^>]*)?>/gi)];
  const alignRe = new RegExp(`text-align:\\s*${wantAlign}`, "i");
  const noAlign = blocks.filter((b) => !alignRe.test(b[0]));
  const centerBlocks = blocks.filter((b) => /text-align:\s*center/i.test(b[0])).length;

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
      // ★2026-08-02 수정: 종전 조건(markerCount<=3 && imageCount<=markerCount)은 0·0도 참이라
      //  사진이 하나도 없는 글을 '동기화 정상'으로 통과시켰다(실측: 마커 0·이미지 0인데 pass=true).
      slot_image_synced: markerCount >= 3 && imageCount <= markerCount,
      photo_slots_ok: markerCount >= 3, // 규격 하한 3
      photo_leak: hasPhotoLeak(richWithImgs), // 발행 HTML에 [사진/지시 잔존?
      emoji_count: emojiHit,           // 발행 HTML 이모지 수
      broken_paren_paragraphs: brokenParen, // 미닫힌 괄호로 쪼개진 문단 수
      // ★이모지는 하한이 생겼다(2026-08-02) — 0개도 결함이다. 종전엔 0을 통과 조건으로 두고 있었다.
      pass: !hasPhotoLeak(richWithImgs) && brokenParen === 0 && markerCount >= 3 && emojiHit >= 2,
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
      expected: wantAlign,               // ★설정값(config/publish BODY_ALIGN)을 기준으로 판정
      total_blocks: blocks.length,
      missing_expected_align: noAlign.length,
      center_blocks: centerBlocks,
      pass: noAlign.length === 0,
      missing_sample: noAlign.slice(0, 5).map((b) => b[0]),
    },
  }, { headers: { "cache-control": "no-store" } });
}
