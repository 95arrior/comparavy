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
  "BlackHanSans": "BlackHanSans.ttf",
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

function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

export interface ThumbInput {
  mainCopy: string;
  subCopy?: string;
  badge?: string;
  identity: VisualIdentity;
  bgDataUrl?: string | null;
  articleId?: string | null; // ★글마다 오브젝트 배치 변주(같은 옷, 다른 포즈). 팔레트·템플릿·폰트는 불변.
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

/* ── 카피 크기: v4 — 가장 긴 줄이 화면 폭 ~87%를 채우게 키운다(카피가 화면 지배). ── */
const TARGET_W = 940; // ≈ 1080 * 0.87
function autoTitleSize(main: string): number {
  const longest = Math.max(...main.split("\n").map((l) => [...l.trim()].length), 1);
  const fill = Math.floor(TARGET_W / longest); // 폭 채움 우선
  return Math.max(66, Math.min(238, fill));    // 아주 짧은 카피 상한 238, 최소 66
}

/* ── 오브젝트 무대: 플랫 기하 덩어리 ── */
type Shape =
  | { kind: "circle"; size: number; x: number; y: number; t: number }
  | { kind: "ring"; size: number; x: number; y: number; t: number; thick: number }
  | { kind: "rrect"; w: number; h: number; r: number; x: number; y: number; t: number; rot?: number }
  | { kind: "semi"; size: number; x: number; y: number; t: number };

// ★포즈 변주 — 팔레트·템플릿·폰트는 고정, 오브젝트 배치만 글(userId+articleId) 시드로 살짝 다르게.
//  좌우 반전 × 블롭 회전 × 배치 이동 3종 → 유저 내 글마다 '같은 옷, 다른 포즈'. 조합공간 곱셈.
function shapeWidth(s: Shape): number { return s.kind === "rrect" ? s.w : s.size; }
function poseShapes(objects: Shape[], seed: string): Shape[] {
  if (!seed) return objects;
  const h = fnv(seed);
  const mirror = (h & 1) === 1;
  const rotDelta = [0, 9, -9][(h >>> 1) % 3];   // 블롭 회전 변주
  const shiftX = [0, 44, -44][(h >>> 3) % 3];   // 배치 좌우 이동 변주
  return objects.map((s0) => {
    const s: Shape = { ...s0, x: s0.x + shiftX };
    if (s.kind === "rrect") s.rot = (s.rot ?? 0) + rotDelta;
    if (!mirror) return s;
    const flipped: Shape = { ...s, x: SIZE - s.x - shapeWidth(s) };
    if (flipped.kind === "rrect" && flipped.rot) flipped.rot = -flipped.rot;
    return flipped;
  });
}

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

// v4: backdrop = 카피 뒤(z축 아래)로 지나가는 오브젝트(링/도넛). 카피는 위에 렌더 → 가독 유지.
interface Template { objects: Shape[]; backdrop?: Shape; align: "left" | "center" }
// 10 템플릿 — 링·도넛·블롭 중심(솔리드 원 나열 지양). 하단 무대 + 카피와 겹치는 backdrop.
//  규칙: 2~4개, 1개는 40%+(≥430px), bleed(화면 밖으로 물림). 좌표=1080 캔버스.
const TEMPLATES: Record<LayoutKey, Template> = {
  "center-cluster": { align: "center", backdrop: { kind: "ring", size: 560, x: 260, y: 90, t: 0, thick: 52 }, objects: [
    { kind: "ring", size: 520, x: 300, y: 620, t: 0, thick: 78 }, { kind: "circle", size: 300, x: 120, y: 800, t: 1 }, { kind: "circle", size: 250, x: 720, y: 820, t: 2 } ] },
  "right-mass": { align: "left", backdrop: { kind: "ring", size: 360, x: 700, y: 120, t: 2, thick: 46 }, objects: [
    { kind: "rrect", w: 620, h: 600, r: 220, x: 600, y: 600, t: 0, rot: 10 }, { kind: "ring", size: 340, x: 380, y: 800, t: 2, thick: 58 } ] },
  "diagonal-flow": { align: "left", backdrop: { kind: "circle", size: 300, x: 720, y: 60, t: 0 }, objects: [
    { kind: "ring", size: 460, x: -110, y: 660, t: 0, thick: 74 }, { kind: "ring", size: 360, x: 400, y: 640, t: 2, thick: 56 }, { kind: "circle", size: 260, x: 780, y: 840, t: 1 } ] },
  "left-blob": { align: "center", backdrop: { kind: "ring", size: 420, x: 120, y: 70, t: 0, thick: 48 }, objects: [
    { kind: "rrect", w: 660, h: 560, r: 260, x: -150, y: 620, t: 0, rot: -12 }, { kind: "ring", size: 320, x: 560, y: 800, t: 2, thick: 54 } ] },
  "ring-accent": { align: "center", objects: [
    { kind: "ring", size: 520, x: 60, y: 600, t: 0, thick: 84 }, { kind: "ring", size: 380, x: 560, y: 720, t: 2, thick: 60 }, { kind: "circle", size: 240, x: 440, y: 840, t: 1 } ] },
  "arch-bottom": { align: "center", backdrop: { kind: "ring", size: 480, x: 300, y: 80, t: 0, thick: 50 }, objects: [
    { kind: "semi", size: 820, x: 130, y: 540, t: 0 }, { kind: "ring", size: 280, x: 130, y: 800, t: 2, thick: 48 } ] },
  "stacked-mass": { align: "left", objects: [
    { kind: "rrect", w: 940, h: 300, r: 120, x: 70, y: 720, t: 1 }, { kind: "ring", size: 380, x: 560, y: 500, t: 0, thick: 66 }, { kind: "circle", size: 220, x: 150, y: 560, t: 2 } ] },
  "corner-pop": { align: "left", backdrop: { kind: "ring", size: 400, x: 640, y: 80, t: 0, thick: 52 }, objects: [
    { kind: "circle", size: 700, x: 620, y: 620, t: 0 }, { kind: "ring", size: 300, x: 40, y: 840, t: 2, thick: 52 } ] },
  "wide-band": { align: "center", objects: [
    { kind: "rrect", w: 1240, h: 400, r: 90, x: -80, y: 740, t: 0 }, { kind: "ring", size: 300, x: 180, y: 660, t: 2, thick: 54 }, { kind: "circle", size: 220, x: 760, y: 820, t: 1 } ] },
  "split-tone": { align: "left", backdrop: { kind: "ring", size: 360, x: 660, y: 90, t: 2, thick: 46 }, objects: [
    { kind: "rrect", w: 1240, h: 560, r: 0, x: -80, y: 600, t: 1 }, { kind: "ring", size: 420, x: 600, y: 660, t: 0, thick: 76 } ] },
};

/* ── 카피(v4) — 배지 없음. 메인 크게 화면 지배, 서브는 메인이 약할 때만 예외 1줄 ── */
function titleEl(main: string, p: Palette, font: string, align: "left" | "center", onDark: boolean): El {
  const size = autoTitleSize(main);
  const lines = main.split("\n").map((l) => l.trim()).filter(Boolean);
  return el("div", { style: {
    display: "flex", flexDirection: "column", gap: 2,
    alignItems: align === "center" ? "center" : "flex-start", textAlign: align,
    fontFamily: font, color: p.title, fontSize: size, fontWeight: 900,
    lineHeight: 1.12, letterSpacing: -Math.round(size * 0.035), // 자간 -3.5%
    textShadow: onDark ? "0 2px 26px rgba(0,0,0,0.32)" : "none", wordBreak: "keep-all",
  } }, lines.map((l) => el("div", { style: { display: "flex" } }, l)));
}
function subEl(text: string, p: Palette, font: string, align: "left" | "center"): El {
  return el("div", { style: { display: "flex", fontFamily: font, color: p.title, opacity: 0.7, fontSize: 34, fontWeight: 600, textAlign: align, wordBreak: "keep-all" } }, text);
}

// 상단 카피 블록 — 배지 폐지. 큰 제목만(+ 메인이 약할 때만 서브 1줄).
function copyBlock(input: ThumbInput, tpl: Template): El {
  const { identity, mainCopy, subCopy } = input;
  const p = identity.palette, ft = identity.fontPair.title, fb = identity.fontPair.body;
  const onDark = isDark(p.bg);
  const hasMain = (mainCopy ?? "").trim().length > 0;
  const T = hasMain ? titleEl(mainCopy, p, ft, tpl.align, onDark) : null;
  // 서브: 메인이 '약할 때'(단 1줄·6자 이하)만 예외적으로 보조 1줄. 그 외 생략.
  const weakMain = hasMain && mainCopy.split("\n").filter((l) => l.trim()).length === 1 && [...mainCopy.trim()].length <= 6;
  const S = (subCopy && subCopy.trim() && weakMain) ? subEl(subCopy, p, fb, tpl.align) : null;
  return el("div", { style: {
    position: "absolute", top: 92, left: 80, right: 80, display: "flex", flexDirection: "column",
    alignItems: tpl.align === "center" ? "center" : "flex-start", gap: 16,
  } }, [T, S].filter(Boolean));
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
  // 포즈 변주(글마다) — 팔레트·템플릿·폰트 불변, 오브젝트 배치만 userId+articleId로.
  const poseSeed = `${identity.layout}|${input.articleId ?? ""}`;
  const posedObjects = poseShapes(tpl.objects, input.articleId ? poseSeed : "");
  // backdrop(카피 뒤 z축 아래로 지나가는 링)은 배경에 가까운 은은한 명도 → 글자 획과 겹쳐도 가독 안 해침.
  const backdropTint = [shade(p.bg, dark ? 13 : -9)];
  const backdrop: El[] = (bgDataUrl || !tpl.backdrop) ? [] : [shapeEl(tpl.backdrop, backdropTint)];
  const objects: El[] = bgDataUrl ? [] : posedObjects.map((s) => shapeEl(s, tints));
  // AI 배경 위 카피 대비 스크림(상단만 은은히).
  const scrim: El | null = bgDataUrl
    ? el("div", { style: { position: "absolute", inset: 0, backgroundImage: `linear-gradient(180deg, ${dark ? "rgba(0,0,0,0.42)" : "rgba(255,255,255,0.34)"}, rgba(0,0,0,0) 55%)` } })
    : null;

  // z순서: 배경 → backdrop(카피 뒤) → 무대 오브젝트 → 스크림 → 카피(최상단, 항상 위로 가독 보장).
  const root = el("div", { style: { display: "flex", width: SIZE, height: SIZE, position: "relative", overflow: "hidden", backgroundColor: p.bg } },
    [bg, ...backdrop, ...objects, scrim, copyBlock(input, tpl)].filter(Boolean));

  const fonts = [
    { name: identity.fontPair.title, data: loadFont(identity.fontPair.title), weight: 900 as const, style: "normal" as const },
    { name: identity.fontPair.body, data: loadFont(identity.fontPair.body), weight: 500 as const, style: "normal" as const },
  ];
  const svg = await satori(root as unknown as React.ReactNode, { width: SIZE, height: SIZE, fonts });
  return Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng());
}
