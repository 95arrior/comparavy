// ★WP 본문 키워드 비주얼 배너(2026-07-12 유저 확정 — 레퍼런스: 금융보카) — 데이터 차트가 아니라
//  '주제 키워드'를 시각 앵커로: ①3D 타이포(영문 약어 키워드만 — IRP·ISA·ETF. 한글 타이포는 깨짐 위험이라 금지)
//  ②오브젝트 은유 배너 ③플랫 일러스트 장면. 글마다 스타일 로테이션(다양성 — 유저 조건).
//  발행 시점 생성(초안 DB 비대 방지), 실패 = 빈 배열(발행은 계속).
import { callImage } from "./geminiImage";

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

function buildBannerPrompt(keyword: string, style: "typo3d" | "object" | "scene", seed: number): string {
  const palette = PALETTES[seed % PALETTES.length];
  const en = englishToken(keyword);
  if (style === "typo3d" && en) {
    return [
      `Premium 3D typography hero banner for a Korean finance blog: the word "${en}" as giant glossy 3D letters (clay/plastic render, soft studio lighting), standing on a clean pastel stage.`,
      `Surround the letters with 2-3 small finance objects (calculator, coins, small chart sculpture) — objects stay small, the word "${en}" is the hero.`,
      `Palette: ${palette}. Square 1:1, generous negative space, agency-grade quality (Behance level), NOT clipart.`,
      `The ONLY text allowed in the image is exactly "${en}" — nothing else. ${NO_TEXT.replace("NO other text", "NO additional text")}`,
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

/** 본문 배너 n장 — 스타일 로테이션(글 시드 기준 시작점 회전, 같은 글 안에서는 서로 다른 스타일). */
export async function generateWpBanners(keyword: string, articleId: string, n = 2): Promise<string[]> {
  const seed = fnv(`${keyword}|${articleId}`);
  const en = englishToken(keyword);
  const styles: ("typo3d" | "object" | "scene")[] = en ? ["typo3d", "object", "scene"] : ["object", "scene"];
  const start = seed % styles.length;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const style = styles[(start + i) % styles.length]!;
    try {
      const img = await callImage(buildBannerPrompt(keyword, style, seed + i * 7), "1:1");
      out.push(`data:${img.mime};base64,${img.base64}`);
    } catch (e) {
      console.error(`[wp] 배너 생성 실패(${style}) — 건너뜀:`, e instanceof Error ? e.message : e);
    }
  }
  return out;
}

/** 본문에 배너 삽입 — 1장: 도입(첫 h2 직전), 2장: 중간 h2 직전. publishPost가 data URL을 미디어로 업로드. */
export function insertBanners(html: string, banners: string[], alt: string): string {
  if (!banners.length) return html;
  let out = html;
  const img = (src: string) => `<figure style="margin:1.6em 0"><img src="${src}" alt="${alt.replace(/"/g, "")}" style="width:100%;border-radius:14px" /></figure>`;
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
  return out;
}
