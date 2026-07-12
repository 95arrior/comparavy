// ★WP 본문 키워드 비주얼 배너(2026-07-12 유저 확정 — 레퍼런스: 금융보카) — 데이터 차트가 아니라
//  '주제 키워드'를 시각 앵커로: ①3D 타이포(영문 약어 키워드만 — IRP·ISA·ETF. 한글 타이포는 깨짐 위험이라 금지)
//  ②오브젝트 은유 배너 ③플랫 일러스트 장면. 글마다 스타일 로테이션(다양성 — 유저 조건).
//  발행 시점 생성(초안 DB 비대 방지), 실패 = 빈 배열(발행은 계속).
import { callImage } from "./geminiImage";
import { createSupabaseAdminClient } from "./supabase-server";
import { renderThumbnail } from "./thumbnailRenderer";
import { visualIdentityFor } from "./visualIdentity";
import { breakThumbCopy } from "./thumbCopyBreak";

function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

// 영문 약어 토큰(3D 타이포 허용 대상) — 키워드에서 추출: IRP, ISA, ETF, CMA, DSR, LTV 등
function englishToken(keyword: string): string | null {
  const m = /\b([A-Z]{2,5}[0-9]{0,2})\b/.exec(keyword.toUpperCase());
  return m ? m[1]! : null;
}

const PALETTES = [
  "soft pink and rose gold with cream background",
  "teal and mint with warm yellow accents",
  "vivid blue and sky gradient with coral accents",
  "fresh green gradient with gold coin accents",
  "warm ivory and orange with navy accents",
  "lavender and periwinkle with silver accents",
];

const NO_TEXT = "ABSOLUTELY NO other text, letters, numbers or Korean characters anywhere (no labels, captions, watermarks, UI). Blank surfaces on any papers/screens. No human faces (silhouettes or cropped only). No brand logos.";

function buildBannerPrompt(keyword: string, style: "stage" | "object" | "scene", seed: number): string {
  const palette = PALETTES[seed % PALETTES.length];
  if (style === "stage") {
    // ★글자 자리 무대(2026-07-12 유저 확정: AI 한글 타이포 깨짐 → 글자는 우리가 G마켓 산스로 조판) —
    //  중앙을 비운 파스텔 무대만 그리게 하고 텍스트는 코드가 얹는다.
    return [
      `Clean premium 3D pastel stage backdrop for a Korean finance blog banner about "${keyword}" (understand only — never render as text).`,
      "Soft rounded podium or floating card shapes at the EDGES only, 2-3 small finance objects (coin, calculator sculpture) tucked in corners — the CENTER of the frame stays EMPTY and low-detail (large Korean typography will be overlaid there later).",
      `Palette: ${palette}. Square 1:1, soft studio lighting, agency-grade (Behance level), NOT clipart.`,
      NO_TEXT,
    ].join(" ");
  }
  if (style === "object") {
    return [
      `Premium graphic banner for a Korean finance blog about "${keyword}" (understand only — never render as text).`,
      "ONE oversized iconic object as the hero (e.g. a giant card, coin stack sculpture, document with a seal, safe, umbrella over coins — pick what fits the topic), centered on a bold gradient background with 2-3 tiny floating accents (confetti coins, sparkles).",
      `Style: modern fintech campaign art, soft 3D or rich flat with airbrush shading, ${palette}. Square 1:1. Agency-grade, NOT clipart.`,
      NO_TEXT,
    ].join(" ");
  }
  return [
    `Flat vector illustration scene for a Korean finance blog about "${keyword}" (understand only — never render as text).`,
    "A simple geometric character (round, minimal face) in an office/home scene interacting with ONE big symbolic object related to the topic (desk with monitor, money bag, growing chart sculpture). Maximum 3 objects total.",
    `Style: premium editorial flat illustration (Toss/fintech campaign grade), bold color blocking, soft shadows, ${palette}. Square 1:1.`,
    NO_TEXT,
  ].join(" ");
}

/** 본문 배너 n장 — 1장째 = AI 무대 배경 + 키워드 G마켓 산스 조판(글자 절대 안 깨짐), 나머지 = 글자 없는 일러스트. */
export async function generateWpBanners(keyword: string, articleId: string, n = 2, brandName = ""): Promise<string[]> {
  const seed = fnv(`${keyword}|${articleId}`);
  const out: string[] = [];
  // 1장째: 무대 배경 → 우리 조판(썸네일과 동일 파이프 — 유저 확정: 글자는 G마켓 산스)
  try {
    const bg = await callImage(buildBannerPrompt(keyword, "stage", seed), "1:1");
    const png = await renderThumbnail({
      mainCopy: breakThumbCopy(keyword.trim().slice(0, 20)),
      identity: visualIdentityFor(articleId),
      press: { brandName: brandName || "" },
      articleId,
      bgDataUrl: `data:${bg.mime};base64,${bg.base64}`,
      fontTitle: "GmarketSansBold",
    });
    out.push(`data:image/png;base64,${png.toString("base64")}`);
  } catch (e) {
    console.error("[wp] 무대 배너 실패 — 건너뜀:", e instanceof Error ? e.message : e);
  }
  // 2장째부터: 순수 일러스트(글자 완전 금지)
  const styles: ("object" | "scene")[] = seed % 2 === 0 ? ["object", "scene"] : ["scene", "object"];
  for (let i = 1; i < n; i++) {
    const style = styles[(i - 1) % styles.length]!;
    try {
      const img = await callImage(buildBannerPrompt(keyword, style, seed + i * 7), "1:1");
      out.push(`data:${img.mime};base64,${img.base64}`);
    } catch (e) {
      console.error(`[wp] 배너 생성 실패(${style}) — 건너뜀:`, e instanceof Error ? e.message : e);
    }
  }
  return out;
}

/** 배너 n장을 스토리지에 올려 공개 URL로 — 초안 단계 삽입용(DB엔 URL만, 미리보기에 보임). */
export async function generateWpBannersToStorage(userId: string, keyword: string, articleId: string, n = 2, brandName = ""): Promise<string[]> {
  const dataUrls = await generateWpBanners(keyword, articleId, n, brandName);
  const admin = createSupabaseAdminClient();
  const out: string[] = [];
  for (let i = 0; i < dataUrls.length; i++) {
    try {
      const m = /^data:(image\/[a-z]+);base64,(.+)$/.exec(dataUrls[i]!);
      if (!m) continue;
      const path = `${userId}/wpbanner-${articleId}-${i}.png`;
      const { error } = await admin.storage.from("ai-images").upload(path, Buffer.from(m[2]!, "base64"), { contentType: m[1]!, upsert: true });
      if (!error) out.push(admin.storage.from("ai-images").getPublicUrl(path).data.publicUrl);
    } catch (e) { console.error("[wp] 배너 업로드 실패:", e instanceof Error ? e.message : e); }
  }
  return out;
}

/** 본문에 배너 삽입 — 1장: 도입(첫 h2 직전), 2장: 중간 h2 직전. publishPost가 data URL을 미디어로 업로드. */
export function insertBanners(html: string, banners: string[], alt: string): string {
  if (!banners.length) return html;
  let out = html;
  const img = (src: string) => `<figure class="ateflo-banner" style="margin:1.6em 0"><img src="${src}" alt="${alt.replace(/"/g, "")}" style="width:100%;border-radius:14px" /></figure>`;
  const h2s = [...out.matchAll(/<h2[^>]*>/g)];
  if (banners[0]) {
    if (h2s.length > 0) out = out.slice(0, h2s[0]!.index!) + img(banners[0]) + out.slice(h2s[0]!.index!);
    else out = img(banners[0]) + out;
  }
  if (banners[1]) {
    const h2s2 = [...out.matchAll(/<h2[^>]*>/g)];
    const mid = h2s2[Math.floor(h2s2.length / 2)];
    if (mid && h2s2.length >= 3) out = out.slice(0, mid.index!) + img(banners[1]) + out.slice(mid.index!);
    else out = out + img(banners[1]);
  }
  if (banners[2]) {
    // 3장째 = 마지막 h2(보통 '자주 묻는 질문') 직전 — 글 후반 시각 리듬(외부 리뷰: 이미지 배치 보완)
    const h2s3 = [...out.matchAll(/<h2[^>]*>/g)];
    const last = h2s3[h2s3.length - 1];
    if (last && h2s3.length >= 4) out = out.slice(0, last.index!) + img(banners[2]) + out.slice(last.index!);
  }
  return out;
}
