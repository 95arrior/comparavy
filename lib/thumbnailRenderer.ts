// ★대표이미지 합성 렌더러 — 토스 이벤트카드 / 당근비즈니스 배너 문법.
//  구도: 상하 2단. 카피 상단 25~35%(크고 진하게, 2줄), 하단 50~60%는 '오브젝트 무대'.
//  배경: 팔레트 주조색 1색 지배 + 동일 색상군 명도 그라데이션(풀블리드 100%). 패널/카드 금지.
//  오브젝트: satori 플랫 기하 덩어리 2~4개(원·링·둥근사각·반원). 크게·하단 겹침·부드러운 그림자.
//  카피 대비 7:1↑(팔레트 title이 배경 대비 10:1↑ 보장). AI 배경은 옵션 경로(있으면 오브젝트 대신 얹음).

import fs from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import type { VisualIdentity, Palette, LayoutKey } from "./visualIdentity";

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

type El = { type: string; props: Record<string, unknown> };
function el(type: string, props: Record<string, unknown> = {}, children?: unknown): El {
  return { type, props: { ...props, ...(children !== undefined ? { children } : {}) } };
}

export interface ThumbInput {
  mainCopy: string;
  subCopy?: string;
  badge?: string;
  identity: VisualIdentity;
  bgDataUrl?: string | null;
}

/* ── 색 유틸 ── */
function shade(hex: string, pct: number): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return hex;
  const adj = (h: string) => {
    const v = Math.max(0, Math.min(255, parseInt(h, 16) + Math.round(255 * (pct / 100))));
    return v.toString(16).padStart(2, "0");
  };
  return `#${adj(m[1])}${adj(m[2])}${adj(m[3])}`;
}
function luminanceQuick(hex: string): number {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return 1;
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const isDark = (hex: string) => luminanceQuick(hex) < 0.45;

/* ── 카피 크기: 너비 맞춤(넘침·자름 불가) ── */
const USABLE_W = 900;
function autoTitleSize(main: string): number {
  const longest = Math.max(...main.split("\n").map((l) => [...l.trim()].length), 1);
  const byLen = longest <= 5 ? 176 : longest <= 7 ? 150 : longest <= 9 ? 124 : longest <= 12 ? 100 : 84;
  const fitW = Math.floor(USABLE_W / longest);
  return Math.max(52, Math.min(byLen, fitW));
}

/* ── 오브젝트 무대: 플랫 기하 덩어리 ── */
type Shape =
  | { kind: "circle"; size: number; x: number; y: number; t: number }
  | { kind: "ring"; size: number; x: number; y: number; t: number; thick: number }
  | { kind: "rrect"; w: number; h: number; r: number; x: number; y: number; t: number; rot?: number }
  | { kind: "semi"; size: number; x: number; y: number; t: number };

const SOFT_SHADOW = "0 24px 70px -26px rgba(0,0,0,0.32)";
function shapeEl(s: Shape, tints: string[]): El {
  const color = tints[s.t % tints.length];
  const base: Record<string, unknown> = { position: "absolute", left: s.x, top: s.y, display: "flex" };
  if (s.kind === "circle") return el("div", { style: { ...base, width: s.size, height: s.size, borderRadius: 9999, background: color, boxShadow: SOFT_SHADOW } });
  if (s.kind === "ring") return el("div", { style: { ...base, width: s.size, height: s.size, borderRadius: 9999, border: `${s.thick}px solid ${color}` } });
  if (s.kind === "semi") return el("div", { style: { ...base, width: s.size, height: s.size / 2, borderTopLeftRadius: s.size / 2, borderTopRightRadius: s.size / 2, background: color, boxShadow: SOFT_SHADOW } });
  const rrStyle: Record<string, unknown> = { ...base, width: s.w, height: s.h, borderRadius: s.r, background: color, boxShadow: SOFT_SHADOW };
  if (s.rot) rrStyle.transform = `rotate(${s.rot}deg)`; // ★undefined 넣으면 satori 에러 → 있을 때만 키 추가
  return el("div", { style: rrStyle });
}

interface Template { objects: Shape[]; align: "left" | "center"; badgePos: "above" | "below" }
// 10 템플릿 — 같은 문법(2단·오브젝트 무대) 안의 변주. 좌표/크기 명세(1080 캔버스, 하단 y≥540).
const TEMPLATES: Record<LayoutKey, Template> = {
  "center-cluster": { align: "center", badgePos: "above", objects: [
    { kind: "circle", size: 520, x: 280, y: 640, t: 0 }, { kind: "circle", size: 340, x: 90, y: 800, t: 1 }, { kind: "circle", size: 300, x: 700, y: 800, t: 2 } ] },
  "right-mass": { align: "left", badgePos: "below", objects: [
    { kind: "rrect", w: 560, h: 560, r: 160, x: 620, y: 620, t: 0, rot: 8 }, { kind: "circle", size: 300, x: 470, y: 860, t: 2 } ] },
  "diagonal-flow": { align: "left", badgePos: "above", objects: [
    { kind: "circle", size: 380, x: -70, y: 720, t: 1 }, { kind: "ring", size: 420, x: 360, y: 620, t: 0, thick: 64 }, { kind: "circle", size: 300, x: 760, y: 820, t: 2 } ] },
  "left-blob": { align: "center", badgePos: "above", objects: [
    { kind: "rrect", w: 620, h: 540, r: 240, x: -130, y: 640, t: 0, rot: -10 }, { kind: "circle", size: 280, x: 560, y: 860, t: 2 } ] },
  "ring-accent": { align: "center", badgePos: "below", objects: [
    { kind: "ring", size: 480, x: 90, y: 640, t: 0, thick: 72 }, { kind: "ring", size: 360, x: 610, y: 740, t: 2, thick: 56 }, { kind: "circle", size: 300, x: 400, y: 820, t: 1 } ] },
  "arch-bottom": { align: "center", badgePos: "above", objects: [
    { kind: "semi", size: 780, x: 150, y: 560, t: 0 }, { kind: "circle", size: 280, x: 120, y: 820, t: 2 } ] },
  "stacked-mass": { align: "left", badgePos: "above", objects: [
    { kind: "rrect", w: 900, h: 300, r: 90, x: 90, y: 720, t: 1 }, { kind: "rrect", w: 560, h: 250, r: 80, x: 300, y: 560, t: 0 } ] },
  "corner-pop": { align: "left", badgePos: "above", objects: [
    { kind: "circle", size: 660, x: 640, y: 640, t: 0 }, { kind: "circle", size: 240, x: 60, y: 880, t: 2 } ] },
  "wide-band": { align: "center", badgePos: "below", objects: [
    { kind: "rrect", w: 1220, h: 380, r: 70, x: -70, y: 760, t: 0 }, { kind: "circle", size: 240, x: 200, y: 830, t: 2 }, { kind: "circle", size: 200, x: 780, y: 850, t: 1 } ] },
  "split-tone": { align: "left", badgePos: "above", objects: [
    { kind: "rrect", w: 1220, h: 540, r: 0, x: -70, y: 620, t: 1 }, { kind: "circle", size: 360, x: 640, y: 700, t: 0 } ] },
};

/* ── 카피/배지 ── */
function badgeEl(text: string, p: Palette, font: string, onDark: boolean): El {
  return el("div", { style: {
    display: "flex", alignItems: "center", background: onDark ? "rgba(255,255,255,0.18)" : shade(p.point, 0),
    color: "#FFFFFF", fontFamily: font, fontSize: 32, fontWeight: 700, padding: "10px 24px", borderRadius: 999, letterSpacing: 0.5,
  } }, text);
}
function titleEl(main: string, p: Palette, font: string, align: "left" | "center", onDark: boolean): El {
  const size = autoTitleSize(main);
  const lines = main.split("\n").map((l) => l.trim()).filter(Boolean);
  return el("div", { style: {
    display: "flex", flexDirection: "column", gap: 4,
    alignItems: align === "center" ? "center" : "flex-start", textAlign: align,
    fontFamily: font, color: p.title, fontSize: size, fontWeight: 900, lineHeight: 1.1, letterSpacing: -1.5,
    textShadow: onDark ? "0 2px 24px rgba(0,0,0,0.30)" : "none", wordBreak: "keep-all",
  } }, lines.map((l) => el("div", { style: { display: "flex" } }, l)));
}
function subEl(text: string, p: Palette, font: string, align: "left" | "center"): El {
  return el("div", { style: { display: "flex", fontFamily: font, color: p.title, opacity: 0.72, fontSize: 34, fontWeight: 500, textAlign: align, wordBreak: "keep-all" } }, text);
}

// 상단 카피 블록(top 25~35%) — 배지 + 큰 제목 + (서브). 무대 오브젝트는 렌더러가 하단에 깐다.
function copyBlock(input: ThumbInput, tpl: Template): El {
  const { identity, mainCopy, subCopy, badge } = input;
  const p = identity.palette, ft = identity.fontPair.title, fb = identity.fontPair.body;
  const onDark = isDark(p.bg);
  const hasMain = (mainCopy ?? "").trim().length > 0;
  const B = badge ? badgeEl(badge, p, ft, onDark) : null;
  const T = hasMain ? titleEl(mainCopy, p, ft, tpl.align, onDark) : null;
  // 서브카피는 메인과 의미 중복 방지: 메인 없을 때만/짧을 때만 보조로. 기본 생략 지향.
  const S = (subCopy && subCopy.trim() && hasMain) ? subEl(subCopy, p, fb, tpl.align) : null;
  const items = (tpl.badgePos === "above" ? [B, T, S] : [T, B, S]).filter(Boolean);
  return el("div", { style: {
    position: "absolute", top: 78, left: 84, right: 84, display: "flex", flexDirection: "column",
    alignItems: tpl.align === "center" ? "center" : "flex-start", gap: 22,
  } }, items);
}

/** 대표이미지 PNG(1:1) 렌더. AI 배경 있으면 그 위에, 없으면 팔레트 플랫 무대. */
export async function renderThumbnail(input: ThumbInput): Promise<Buffer> {
  return renderAt(input, SIZE);
}
/** 축소 미리보기 PNG(가독성 확인용). */
export async function renderThumbnailAt(input: ThumbInput, width: number): Promise<Buffer> {
  return renderAt(input, width);
}

async function renderAt(input: ThumbInput, width: number): Promise<Buffer> {
  const { identity, bgDataUrl } = input;
  const p = identity.palette;
  const tpl = TEMPLATES[identity.layout] ?? TEMPLATES["center-cluster"];
  const dark = isDark(p.bg);

  // 배경: 주조색 지배 + 동일 색상군 미묘한 명도 그라데이션(풀블리드).
  const bg: El = bgDataUrl
    ? el("img", { src: bgDataUrl, width: SIZE, height: SIZE, style: { position: "absolute", inset: 0, objectFit: "cover" } })
    : el("div", { style: { position: "absolute", inset: 0, backgroundImage: `linear-gradient(160deg, ${shade(p.bg, dark ? 7 : 5)}, ${shade(p.bg, dark ? -9 : -7)})` } });

  // 오브젝트 무대: AI 배경이면 생략(AI가 시각 담당), 아니면 플랫 덩어리.
  const tints = [p.point, shade(p.bg, dark ? 15 : -12), shade(p.point, dark ? 14 : -16)];
  const objects: El[] = bgDataUrl ? [] : tpl.objects.map((s) => shapeEl(s, tints));
  // AI 배경 위 카피 대비 스크림(상단만 은은히).
  const scrim: El | null = bgDataUrl
    ? el("div", { style: { position: "absolute", inset: 0, backgroundImage: `linear-gradient(180deg, ${dark ? "rgba(0,0,0,0.42)" : "rgba(255,255,255,0.34)"}, rgba(0,0,0,0) 55%)` } })
    : null;

  const root = el("div", { style: { display: "flex", width: SIZE, height: SIZE, position: "relative", overflow: "hidden", backgroundColor: p.bg } },
    [bg, ...objects, scrim, copyBlock(input, tpl)].filter(Boolean));

  const fonts = [
    { name: identity.fontPair.title, data: loadFont(identity.fontPair.title), weight: 900 as const, style: "normal" as const },
    { name: identity.fontPair.body, data: loadFont(identity.fontPair.body), weight: 500 as const, style: "normal" as const },
  ];
  const svg = await satori(root as unknown as React.ReactNode, { width: SIZE, height: SIZE, fonts });
  return Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng());
}
