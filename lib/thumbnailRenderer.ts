// ★대표이미지 합성 렌더러 — AI는 배경만, 한글 카피는 코드(satori)가 렌더 → 절대 안 깨진다.
//  명제1(절제된 완성도): 시각 요소 3개 이내(배지·메인·서브/도형 하나), 여백 확보, 느낌표·무지개·충격 연출 금지.
//  1:1 출력(홈판 정사각 크롭). 배경 없으면 팔레트 기반 코드 폴백 → AI 실패해도 발행 가능.

import fs from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import type { VisualIdentity, Palette, BgStyle, LayoutKey } from "./visualIdentity";

const SIZE = 1080;
const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const FONT_FILES: Record<string, string> = {
  "Pretendard-Black": "Pretendard-Black.otf",
  "Pretendard-Bold": "Pretendard-Bold.otf",
  "Pretendard-SemiBold": "Pretendard-SemiBold.otf",
  "Pretendard-Regular": "Pretendard-Regular.otf",
  "GowunBatang-Bold": "GowunBatang-Bold.ttf",
  "Jua": "Jua.ttf",
  "DoHyeon": "DoHyeon.ttf",
};
const fontCache = new Map<string, Buffer>();
function loadFont(name: string): Buffer {
  const file = FONT_FILES[name] ?? FONT_FILES["Pretendard-Bold"];
  if (!fontCache.has(file)) fontCache.set(file, fs.readFileSync(path.join(FONT_DIR, file)));
  return fontCache.get(file)!;
}

// 하이퍼스크립트 — satori는 { type, props: { children } } VDOM을 받는다(JSX 불필요).
type El = { type: string; props: Record<string, unknown> };
function el(type: string, props: Record<string, unknown> = {}, children?: unknown): El {
  return { type, props: { ...props, ...(children !== undefined ? { children } : {}) } };
}

export interface ThumbInput {
  mainCopy: string;   // 메인 카피(1~2줄, 20자 이내). \n으로 줄 구분 가능
  subCopy?: string;   // 서브(선택, 15자 이내)
  badge?: string;     // 카테고리 배지(예: 경제정보)
  identity: VisualIdentity;
  bgDataUrl?: string | null; // AI 배경(data: URL). 없으면 코드 폴백
}

// 카피 길이 → 자동 폰트 크기(축소 썸네일에서도 읽히게 크게).
function autoTitleSize(main: string): number {
  const longest = Math.max(...main.split("\n").map((l) => l.trim().length), 1);
  if (longest <= 5) return 168;
  if (longest <= 7) return 140;
  if (longest <= 9) return 116;
  if (longest <= 12) return 96;
  return 80;
}

// 코드 폴백 배경 — 팔레트로 스타일별 그라데이션/도형. AI 없이도 완성도.
function fallbackBgStyle(bgStyle: BgStyle, p: Palette): Record<string, unknown> {
  const darker = shade(p.bg, -18);
  const lighter = shade(p.bg, 12);
  switch (bgStyle) {
    case "soft-gradient": return { backgroundImage: `linear-gradient(145deg, ${lighter}, ${darker})` };
    case "duotone-fade": return { backgroundImage: `linear-gradient(160deg, ${p.bg}, ${shade(p.point, -10)})` };
    case "grain-wash": return { backgroundImage: `linear-gradient(120deg, ${p.bg}, ${lighter})` };
    case "paper-texture": return { backgroundColor: p.bg };
    case "geometric-lines": return { backgroundImage: `linear-gradient(135deg, ${darker}, ${p.bg})` };
    case "bokeh-soft": return { backgroundImage: `radial-gradient(circle at 70% 30%, ${lighter}, ${darker})` };
    case "abstract-shapes": return { backgroundImage: `radial-gradient(circle at 30% 70%, ${lighter}, ${p.bg})` };
    case "blurred-photo": return { backgroundImage: `radial-gradient(circle at 50% 40%, ${lighter}, ${darker})` };
    default: return { backgroundColor: p.bg };
  }
}
// 폴백 배경에 얹는 은은한 도형(요소 수엔 안 셈 — 배경 텍스처). 절제: 1~2개, 저대비.
function fallbackShapes(bgStyle: BgStyle, p: Palette): El[] {
  if (bgStyle === "abstract-shapes") return [
    el("div", { style: { position: "absolute", top: 120, right: 90, width: 360, height: 360, borderRadius: 999, background: p.point, opacity: 0.14 } }),
    el("div", { style: { position: "absolute", bottom: 80, left: 60, width: 220, height: 220, borderRadius: 999, background: p.point, opacity: 0.10 } }),
  ];
  if (bgStyle === "geometric-lines") return [
    el("div", { style: { position: "absolute", top: -60, left: -60, width: 520, height: 520, borderRadius: 40, border: `10px solid ${p.point}`, opacity: 0.12, transform: "rotate(18deg)" } }),
  ];
  if (bgStyle === "bokeh-soft") return [
    el("div", { style: { position: "absolute", top: 160, left: 140, width: 180, height: 180, borderRadius: 999, background: p.point, opacity: 0.12 } }),
  ];
  return [];
}
function shade(hex: string, pct: number): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return hex;
  const adj = (h: string) => {
    const v = Math.max(0, Math.min(255, parseInt(h, 16) + Math.round(255 * (pct / 100))));
    return v.toString(16).padStart(2, "0");
  };
  return `#${adj(m[1])}${adj(m[2])}${adj(m[3])}`;
}

function badgeEl(text: string, p: Palette, fontTitle: string): El {
  return el("div", {
    style: {
      display: "flex", alignItems: "center", alignSelf: "flex-start",
      background: p.point, color: "#FFFFFF", fontFamily: fontTitle,
      fontSize: 34, fontWeight: 700, padding: "12px 26px", borderRadius: 999, letterSpacing: 1,
    },
  }, text);
}
function titleEl(main: string, p: Palette, fontTitle: string, align: "left" | "center", onDark: boolean): El {
  const size = autoTitleSize(main);
  const lines = main.split("\n").map((l) => l.trim()).filter(Boolean);
  return el("div", {
    style: {
      display: "flex", flexDirection: "column", gap: 6,
      alignItems: align === "center" ? "center" : "flex-start",
      textAlign: align, fontFamily: fontTitle, color: p.title,
      fontSize: size, fontWeight: 900, lineHeight: 1.14, letterSpacing: -1,
      textShadow: onDark ? "0 2px 18px rgba(0,0,0,0.35)" : "0 1px 8px rgba(255,255,255,0.4)",
      wordBreak: "keep-all",
    },
  }, lines.map((l) => el("div", { style: { display: "flex" } }, l)));
}
function subEl(text: string, p: Palette, fontBody: string, align: "left" | "center"): El {
  return el("div", {
    style: {
      display: "flex", fontFamily: fontBody, color: p.title, opacity: 0.82,
      fontSize: 40, fontWeight: 500, textAlign: align, wordBreak: "keep-all",
    },
  }, text);
}
// 텍스트 뒤 가독 패널(대비 확보) — 반투명.
function panel(children: unknown[], p: Palette, extra: Record<string, unknown> = {}): El {
  return el("div", {
    style: {
      display: "flex", flexDirection: "column", gap: 24, background: p.panel,
      borderRadius: 28, padding: "48px 52px", ...extra,
    },
  }, children);
}

const isDark = (hex: string) => luminanceQuick(hex) < 0.4;
function luminanceQuick(hex: string): number {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return 1;
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// ── 10 레이아웃 — 각각 구조가 다른 배치. 요소 3개 이내(배지/메인/서브). ──
function composeLayout(layout: LayoutKey, input: ThumbInput): El {
  const { identity, mainCopy, subCopy, badge } = input;
  const p = identity.palette;
  const ft = identity.fontPair.title, fb = identity.fontPair.body;
  const onDark = isDark(p.bg);
  const B = badge ? badgeEl(badge, p, ft) : null;
  const T = titleEl(mainCopy, p, ft, "center", onDark);
  const Tl = titleEl(mainCopy, p, ft, "left", onDark);
  const S = subCopy ? subEl(subCopy, p, fb, "center") : null;
  const Sl = subCopy ? subEl(subCopy, p, fb, "left") : null;
  const pad = 90;

  const box = (children: unknown[], style: Record<string, unknown>) =>
    el("div", { style: { position: "absolute", display: "flex", ...style } }, children);

  switch (layout) {
    case "badge-top-center":
      return box([B, panel([T, S].filter(Boolean) as El[], p)].filter(Boolean),
        { inset: 0, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40, padding: pad });
    case "editorial-left":
      return box([B, Tl, Sl].filter(Boolean),
        { inset: 0, flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: 28, padding: pad });
    case "band-bottom":
      return box([
        el("div", { style: { display: "flex", flex: 1, alignItems: "flex-start", padding: pad } }, [B].filter(Boolean)),
        el("div", { style: { display: "flex", flexDirection: "column", gap: 16, background: p.panel, padding: "56px 72px", width: "100%" } }, [Tl, Sl].filter(Boolean)),
      ], { inset: 0, flexDirection: "column", justifyContent: "space-between" });
    case "framed":
      return box([
        el("div", { style: { position: "absolute", inset: 44, border: `4px solid ${p.point}`, borderRadius: 24 } }),
        box([B, T, S].filter(Boolean), { inset: 0, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30, padding: pad + 30 }),
      ], { inset: 0 });
    case "split-horizontal":
      return box([
        el("div", { style: { display: "flex", flex: 1, alignItems: "flex-end", padding: pad, width: "100%", background: shade(p.bg, isDark(p.bg) ? 8 : -8) } }, [Tl].filter(Boolean)),
        el("div", { style: { display: "flex", flexDirection: "column", flex: 1, alignItems: "flex-start", justifyContent: "flex-start", gap: 20, padding: pad, width: "100%" } }, [B, Sl].filter(Boolean)),
      ], { inset: 0, flexDirection: "column" });
    case "diagonal-ribbon":
      return box([
        el("div", { style: { position: "absolute", top: 200, left: -100, right: -100, height: 300, background: p.point, opacity: 0.16, transform: "rotate(-12deg)" } }),
        box([B, T, S].filter(Boolean), { inset: 0, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, padding: pad }),
      ], { inset: 0 });
    case "corner-badge":
      return box([
        B ? box([B], { top: pad, right: pad }) : el("div", {}),
        box([Tl, Sl].filter(Boolean), { inset: 0, flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-end", gap: 22, padding: pad }),
      ], { inset: 0 });
    case "stacked-serifhero":
      return box([B, Tl, Sl].filter(Boolean),
        { inset: 0, flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: 34, padding: pad });
    case "quote-panel":
      return box([panel([T, S].filter(Boolean) as El[], p, { borderLeft: `10px solid ${p.point}` })],
        { inset: 0, flexDirection: "column", alignItems: "center", justifyContent: "center", padding: pad });
    case "minimal-centered":
    default:
      return box([B, T, S].filter(Boolean),
        { inset: 0, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30, padding: pad + 40 });
  }
}

/** 대표이미지 PNG(1:1) 렌더. AI 배경 있으면 깔고, 없으면 코드 폴백. */
export async function renderThumbnail(input: ThumbInput): Promise<Buffer> {
  const { identity, bgDataUrl } = input;
  const p = identity.palette;

  const bgLayer: El = bgDataUrl
    ? el("img", { src: bgDataUrl, width: SIZE, height: SIZE, style: { position: "absolute", inset: 0, objectFit: "cover" } })
    : el("div", { style: { position: "absolute", inset: 0, ...fallbackBgStyle(identity.bgStyle, p) } });
  const shapes = bgDataUrl ? [] : fallbackShapes(identity.bgStyle, p);
  // AI 배경 위엔 텍스트 대비용 은은한 스크림
  const scrim: El | null = bgDataUrl
    ? el("div", { style: { position: "absolute", inset: 0, background: isDark(p.bg) ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.20)" } })
    : null;

  const root = el("div", {
    style: { display: "flex", width: SIZE, height: SIZE, position: "relative", backgroundColor: p.bg, overflow: "hidden" },
  }, [bgLayer, ...shapes, scrim, composeLayout(identity.layout, input)].filter(Boolean));

  const fonts = [
    { name: identity.fontPair.title, data: loadFont(identity.fontPair.title), weight: 900 as const, style: "normal" as const },
    { name: identity.fontPair.body, data: loadFont(identity.fontPair.body), weight: 500 as const, style: "normal" as const },
  ];
  const svg = await satori(root as unknown as React.ReactNode, { width: SIZE, height: SIZE, fonts });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: SIZE } }).render().asPng();
  return Buffer.from(png);
}

/** 축소 미리보기 PNG(가독성 확인용) — 같은 SVG를 width px로 렌더. */
export async function renderThumbnailAt(input: ThumbInput, width: number): Promise<Buffer> {
  const { identity } = input;
  const p = identity.palette;
  const bgLayer: El = input.bgDataUrl
    ? el("img", { src: input.bgDataUrl, width: SIZE, height: SIZE, style: { position: "absolute", inset: 0, objectFit: "cover" } })
    : el("div", { style: { position: "absolute", inset: 0, ...fallbackBgStyle(identity.bgStyle, p) } });
  const shapes = input.bgDataUrl ? [] : fallbackShapes(identity.bgStyle, p);
  const root = el("div", { style: { display: "flex", width: SIZE, height: SIZE, position: "relative", backgroundColor: p.bg, overflow: "hidden" } },
    [bgLayer, ...shapes, composeLayout(identity.layout, input)].filter(Boolean));
  const fonts = [
    { name: identity.fontPair.title, data: loadFont(identity.fontPair.title), weight: 900 as const, style: "normal" as const },
    { name: identity.fontPair.body, data: loadFont(identity.fontPair.body), weight: 500 as const, style: "normal" as const },
  ];
  const svg = await satori(root as unknown as React.ReactNode, { width: SIZE, height: SIZE, fonts });
  return Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng());
}
