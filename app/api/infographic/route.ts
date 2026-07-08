import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { renderBarChart, renderTableCard, renderChecklistCard, renderStatCard, renderBeforeAfterCard, renderCompositionCard } from "@/lib/infographicRenderer";
import { parseCardMarker, verifyNumbersInBody } from "@/lib/cardMarker";

export const runtime = "nodejs";
export const maxDuration = 30;

// ★인포그래픽 — 본문의 실데이터(표·☐체크리스트)를 '공들인 자료' 이미지로. 크레딧 0(코드 렌더).
//  자동 추출: 표 → (셀 대부분 숫자) 비교 막대 차트 / 아니면 표 카드. ☐ 절차 → 체크리스트 카드.

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function parseFirstTable(html: string): { headers: string[]; rows: string[][] } | null {
  const t = /<table[\s\S]*?<\/table>/i.exec(html)?.[0];
  if (!t) return null;
  const trs = t.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  if (trs.length < 2 || !trs[0]) return null;
  const cells = (tr: string) => (tr.match(/<t[hd][\s\S]*?<\/t[hd]>/gi) ?? []).map((c) => stripTags(c)).filter(Boolean);
  const headers = cells(trs[0]);
  const rows = trs.slice(1).map(cells).filter((r) => r.length > 0);
  if (headers.length < 2 || rows.length === 0) return null;
  return { headers, rows };
}

function parseChecklist(html: string): string[] {
  const text = html.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<\/p>/gi, "\n");
  const lines = stripTagsKeepLines(text).split("\n").map((l) => l.trim());
  const items = lines.filter((l) => /^[☐□✅✔]/.test(l)).map((l) => l.replace(/^[☐□✅✔]\s*/, "").trim()).filter(Boolean);
  return items;
}
function stripTagsKeepLines(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ");
}

const numLike = (s: string) => /^[\d,.\s%~+\-억만원년월일]+$/.test(s.trim()) && /\d/.test(s);
const toNum = (s: string) => parseFloat(s.replace(/[^\d.\-]/g, ""));

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const articleId = typeof body.articleId === "string" ? body.articleId : null;
  const slotIdx = Number.isInteger(body.slotIdx) ? Number(body.slotIdx) : null;
  const slotDesc = typeof body.slotDesc === "string" ? body.slotDesc : "";
  if (!articleId) return NextResponse.json({ error: "글을 찾을 수 없어요." }, { status: 400 });

  const { data: article } = await supabase.from("articles").select("id, title, content, images").eq("id", articleId).eq("user_id", user.id).single();
  if (!article) return NextResponse.json({ error: "글을 찾을 수 없어요." }, { status: 404 });

  let brand = "MY BLOG";
  try { const { data: bp } = await supabase.from("blog_profiles").select("blog_name").eq("user_id", user.id).order("created_at", { ascending: true }).limit(1).single(); brand = (bp?.blog_name ?? "").trim() || brand; } catch { /* ignore */ }

  const html = String(article.content ?? "");
  const wantChecklist = /체크리스트|절차|순서|준비물/.test(slotDesc);
  const table = parseFirstTable(html);
  const checklist = parseChecklist(html);
  const cardTitle = stripTags(slotDesc).replace(/^\[?사진:?\s*/, "").replace(/(이|가) 놓인.*$/, "").slice(0, 24).trim() || String(article.title ?? "").slice(0, 24);

  try {
    let png: Buffer | null = null;
    // ★구조화 카드 마커(유저 승인 4종) — slotDesc가 [카드: 유형|...] 구조면 템플릿 직행 + 본문 실값 대조
    const cardSpec = parseCardMarker(stripTags(slotDesc).replace(/^\[?카드:?\s*/, ""));
    if (cardSpec) {
      const missing = verifyNumbersInBody(cardSpec, html);
      if (missing.length > 0) return NextResponse.json({ error: `카드의 숫자(${missing.slice(0, 3).join(", ")})가 본문에 없어요 — 본문 실값만 카드로 만들 수 있어요.` }, { status: 422 });
      if (cardSpec.kind === "stat") png = await renderStatCard({ title: cardSpec.title, value: cardSpec.value, label: cardSpec.label, subs: cardSpec.subs, brand });
      else if (cardSpec.kind === "compare") png = await renderBeforeAfterCard({ title: cardSpec.title, rows: cardSpec.rows, brand });
      else if (cardSpec.kind === "composition") png = await renderCompositionCard({ title: cardSpec.title, items: cardSpec.items, brand });
      else png = await renderChecklistCard({ title: cardSpec.title, items: cardSpec.items, brand });
    } else if (wantChecklist && checklist.length >= 2) {
      png = await renderChecklistCard({ title: cardTitle || "신청 절차 한눈에", items: checklist, brand });
    } else if (table) {
      // 숫자 밀도 높고 2~3열이면 비교 막대, 아니면 표 카드
      const dataCols = table.headers.length - 1;
      const numericRows = table.rows.filter((r) => r.slice(1).every((c) => numLike(c)));
      if (dataCols >= 1 && dataCols <= 2 && numericRows.length >= 2) {
        png = await renderBarChart({
          title: cardTitle || String(article.title ?? "").slice(0, 24),
          seriesNames: table.headers.slice(1),
          groups: numericRows.slice(0, 6).map((r) => ({ label: (r[0] ?? "").slice(0, 8), values: r.slice(1).map(toNum) })),
          brand,
        });
      } else {
        png = await renderTableCard({ title: cardTitle || "한눈에 비교", headers: table.headers, rows: table.rows, brand });
      }
    } else if (checklist.length >= 2) {
      png = await renderChecklistCard({ title: cardTitle || "체크리스트", items: checklist, brand });
    }
    if (!png) return NextResponse.json({ error: "글에서 표나 체크리스트를 찾지 못했어요 — 이 글엔 ✦ AI 이미지가 맞아요." }, { status: 422 });

    const admin = createSupabaseAdminClient();
    try { await admin.storage.createBucket("ai-images", { public: true }); } catch { /* 있음 */ }
    const path = `${user.id}/${crypto.randomUUID()}.png`;
    const { error: upErr } = await admin.storage.from("ai-images").upload(path, png, { contentType: "image/png" });
    if (upErr) return NextResponse.json({ error: "이미지를 저장하지 못했어요." }, { status: 500 });
    const url = admin.storage.from("ai-images").getPublicUrl(path).data.publicUrl;

    if (slotIdx !== null) {
      try {
        const merged = { ...((article.images as Record<string, string>) ?? {}), [String(slotIdx)]: url };
        await supabase.from("articles").update({ images: merged }).eq("id", articleId).eq("user_id", user.id);
      } catch { /* 컬럼 미적용 폴백 */ }
    }
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    console.error("[infographic]", e);
    return NextResponse.json({ error: "인포그래픽을 만들지 못했어요." }, { status: 500 });
  }
}
