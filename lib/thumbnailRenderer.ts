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
  "GmarketSansBold": "GmarketSansBold.ttf", // ★썸네일 메이커 디폴트(OFL 1.1, 이베이코리아)
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
  /** 배경 이미지 위 팔레트색 워시(0~1) — 높을수록 오브젝트가 은은해지고 텍스트가 주인공(썸네일 메이커 톤 조절). */
  bgWash?: number;
  /** 타이틀 폰트 오버라이드(썸네일 메이커 — 기본 GmarketSansBold) */
  fontTitle?: string;
  /** ★정중앙 모드(썸네일 메이커) — 카피를 화면 정중앙에, 코드 오브젝트 무대 생략(배경 사진이 주인공) */
  centerCopy?: boolean;
  /** ★보도형(서울대병원 뉴스룸 문법) — 실사 배경+하단 다크 오버레이+좌하단 큰 카피+상하단 브랜드 바 */
  press?: { brandName: string };
  /** WP 전용 고정 문구 크기(2026-07-13) — 미지정 시 네이버 원판 동적 크기(148/120, 홈판=큰 글씨가 정답) */
  pressFixedSize?: number;
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
  // ★문구는 항상 좌측 정렬(2026-08-11 유저: "중앙 배치 문구가 이미지를 가려 클릭률이 저조" — 위치만 좌측으로).
  //  템플릿 align은 오브젝트 배치에만 남고, 카피 정렬은 좌측 고정 — 중앙이 비어 그림(하단 히어로)이 온전히 보인다.
  const T = hasMain ? titleEl(mainCopy, p, ft, "left", onDark) : null;
  // 서브: 메인이 '약할 때'(단 1줄·6자 이하)만 예외적으로 보조 1줄. 그 외 생략.
  const weakMain = hasMain && mainCopy.split("\n").filter((l) => l.trim()).length === 1 && [...mainCopy.trim()].length <= 6;
  const S = (subCopy && subCopy.trim() && weakMain) ? subEl(subCopy, p, fb, "left") : null;
  if (input.centerCopy) {
    return el("div", { style: {
      position: "absolute", top: 0, left: 60, right: 60, bottom: 0, display: "flex", flexDirection: "column",
      alignItems: "flex-start", justifyContent: "center", gap: 16,
    } }, [T, S].filter(Boolean));
  }
  // ★하단 좌측(2026-08-11 유저: "하단에는 약간 그라데이션, 글자 좀 잘 보이게") — 이미지가 상단에 온전히 보이고
  //  카피는 하단 스크림 위에 얹힌다. 바닥에서 180px 띄우는 이유 = 홈판 카드가 좌하단에 채널 칩을 오버레이(2026-07-10 실측).
  return el("div", { style: {
    position: "absolute", left: 80, right: 80, bottom: 180, display: "flex", flexDirection: "column",
    alignItems: "flex-start", gap: 16,
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

async function renderAt(rawInput: ThumbInput, width: number): Promise<Buffer> {
  // ★폰트 오버라이드(썸네일 메이커) — 팔레트·레이아웃은 그대로, 타이틀 폰트만 교체
  const input: ThumbInput = rawInput.fontTitle
    ? { ...rawInput, identity: { ...rawInput.identity, fontPair: { ...rawInput.identity.fontPair, title: rawInput.fontTitle } } }
    : rawInput;
  const { identity, bgDataUrl } = input;
  const p = identity.palette;
  const tpl = TEMPLATES[identity.layout] ?? TEMPLATES["center-cluster"];
  const dark = isDark(p.bg);

  // 배경: 주조색 지배 + 동일 색상군 미묘한 명도 그라데이션(풀블리드).
  const bg: El = bgDataUrl
    ? el("img", { src: bgDataUrl, width: SIZE, height: SIZE, style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, objectFit: "cover" } })
    : el("div", { style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `linear-gradient(160deg, ${shade(p.bg, dark ? 7 : 5)}, ${shade(p.bg, dark ? -9 : -7)})` } });

  // 오브젝트 무대: AI 배경이면 생략(AI가 시각 담당), 아니면 플랫 덩어리.
  const tints = [p.point, shade(p.bg, dark ? 15 : -12), shade(p.point, dark ? 14 : -16)];
  // 포즈 변주(글마다) — 팔레트·템플릿·폰트 불변, 오브젝트 배치만 userId+articleId로.
  const poseSeed = `${identity.layout}|${input.articleId ?? ""}`;
  const posedObjects = input.centerCopy ? [] : poseShapes(tpl.objects, input.articleId ? poseSeed : "");
  // backdrop(카피 뒤 z축 아래로 지나가는 링)은 배경에 가까운 은은한 명도 → 글자 획과 겹쳐도 가독 안 해침.
  const backdropTint = [shade(p.bg, dark ? 13 : -9)];
  const backdrop: El[] = (bgDataUrl || !tpl.backdrop) ? [] : [shapeEl(tpl.backdrop, backdropTint)];
  const objects: El[] = bgDataUrl ? [] : posedObjects.map((s) => shapeEl(s, tints));
  // AI 배경 위 카피 대비 스크림 — ★하단 그라데이션(2026-08-11 유저: "하단에는 약간 그라데이션, 글자 좀 잘 보이게").
  //  카피가 하단 좌측으로 내려갔으므로 스크림도 아래에서 위로 — 상단 이미지는 건드리지 않는다.
  const scrim: El | null = bgDataUrl
    ? el("div", { style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: "linear-gradient(0deg, rgba(6,8,14,0.72), rgba(6,8,14,0.38) 32%, rgba(0,0,0,0) 56%)" } })
    : null;

  // ★보도형 — 실사 위 다크 그라데이션 + 좌하단 카피 + 브랜드 프레임(운영자가 공들인 제작물 문법)
  if (input.press) {
    // ★홈판 레이아웃 v2(2026-07-10 유저 실측: 홈판 카드가 좌하단에 채널 칩을 오버레이 — 좌하단 카피가 깔림)
    //  문구=정중앙 대형(타이포 중심, 실측 상위 썸네일 문법) · 하단 15%=세이프 존(아무것도 안 둠) · 브랜드=상단 얇게
    const brand = input.press.brandName.trim() || "BLOG";
    const lines = (input.mainCopy ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
    const longest = Math.max(...lines.map((l) => [...l].length), 1);
    // ★크기 통일(2026-07-13 유저 확정: 텍스트 크기는 일정해야) — 네이버 120 고정 / WP 112 고정(pressFixedSize).
    //  문구 소스가 9자/줄을 보장(추천 게이트+폴백 fit9)하므로 사실상 전부 고정 크기 — 초과 엣지만 안전 축소.
    //  ★이미지 배경은 104로 한 단계 축소(2026-08-17 유저 "비율조정" — 인물 중심 썸네일에서 120은 인물과 경쟁). 모드 내 고정은 유지.
    const uniform = input.pressFixedSize ?? (bgDataUrl ? 104 : 120);
    const pressSize = longest <= 9 ? uniform : Math.floor(Math.min(978, uniform * 8.7) / longest);
    const accent = "#FFD34D"; // 핵심(마지막) 줄 포인트 — 다크 위 최고 가독 옐로
    // ★최종(2026-07-10): 풀블리드 — 액자는 배경 퀄이 오른 지금 이미지를 잘라 손해(+흰 홈판에서 경계 소실). 칩 회피는 중앙 문구+세이프 존이 담당
    const M = 0;
    // ★색면(코드) 배경 분리(2026-07-10 실측: 이미지 가독용 중앙 다크 스크림이 색면까지 덮어 어떤 팔레트든 먹빛 단색이 됨)
    //  — 색면은 비비드 컬러 포스터: 팔레트 주조색 라디얼 + 포인트색 글로우 + 가장자리만 비네트. 밝은 팔레트는 포인트색을 주조로(흰 글자 대비)
    const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1, 7), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
    const flatBase = isDark(p.bg) ? p.bg : p.point;
    const pressRoot = el("div", { style: { display: "flex", width: SIZE, height: SIZE, position: "relative", overflow: "hidden", backgroundColor: "#101728" } }, [
      el("div", { style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", display: "flex" } }, bgDataUrl ? [
        el("img", { src: bgDataUrl, width: SIZE, height: SIZE, style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, objectFit: "cover" } }),
        // ★전면 오버레이 폐지(2026-08-17 유저: "전체 블러 하지 말고 하단만") — 이미지 v2가 상반신 클로즈업+하단 여백을
        //  주므로 상단은 원본 그대로 두고, 문구가 앉는 하단만 그라데이션으로 어둡게. 가독은 텍스트 섀도(0.72)와 분담.
        // ★비율 조정(2026-08-17 유저 실물: 문구가 중간까지 올라오고 아래 빈 어둠이 큼) — 그라데이션을 38%로 압축해 일러스트를 더 살린다
        el("div", { style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: "linear-gradient(0deg, rgba(6,8,14,0.82), rgba(6,8,14,0.46) 22%, rgba(0,0,0,0) 38%)" } }),
      ] : [
        el("div", { style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `radial-gradient(circle at 28% 18%, ${shade(flatBase, isDark(p.bg) ? 38 : 26)}, ${shade(flatBase, isDark(p.bg) ? -8 : -16)})` } }),
        el("div", { style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `radial-gradient(circle at 76% 82%, ${rgba(shade(p.point, isDark(p.bg) ? 16 : 24), isDark(p.bg) ? 0.55 : 0.42)} 0%, rgba(0,0,0,0) 55%)` } }),
        el("div", { style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 60%, rgba(8,14,28,0.32) 100%)" } }),
      ]),
      // 브랜드 — 상단 얇게(하단은 채널 칩 세이프 존)
      el("div", { style: { position: "absolute", left: 0, right: 0, top: M + 34, display: "flex", justifyContent: "center", fontFamily: identity.fontPair.body, fontSize: 19, fontWeight: 500, color: "rgba(255,255,255,0.65)", letterSpacing: 8 } }, brand),
      // 문구 — ★하단 배치(2026-08-17 유저: 이미지 v2가 하단 여백을 남기므로 문구는 아래로, 정중앙 폐기).
      //  이미지 배경일 때만 — 색면은 하단 스크림이 없어 중앙 유지. bottom 175 = 채널 칩 세이프 존(하단 15%) 위.
      el("div", { style: bgDataUrl
        ? { position: "absolute", left: 48, right: 48, bottom: 96, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 10 } // ★175→96(2026-08-17 유저: "텍스트를 좀 내려야") — 칩과는 문구가 중앙 정렬이라 좌하단 칩과 안 겹침
        : { position: "absolute", left: 48, right: 48, top: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 } },
        [
          // 이미지 배경이면 subCopy는 문구 기둥 위 작은 줄로 합류(별도 절대 배치는 하단 문구와 겹친다)
          bgDataUrl && input.subCopy?.trim() ? el("div", { style: { display: "flex", fontFamily: identity.fontPair.body, fontSize: 30, fontWeight: 500, color: "rgba(255,255,255,0.78)", textShadow: "0 2px 12px rgba(0,0,0,0.7)" } }, input.subCopy.trim()) : null,
          ...lines.map((l, i) => el("div", { style: { display: "flex", textAlign: "center", fontFamily: identity.fontPair.title, fontSize: pressSize, fontWeight: 900, color: i === lines.length - 1 && lines.length > 1 ? accent : "#FFFFFF", lineHeight: 1.16, letterSpacing: -Math.round(pressSize * 0.03), wordBreak: "keep-all", textShadow: bgDataUrl ? "0 3px 14px rgba(0,0,0,0.72), 0 8px 44px rgba(0,0,0,0.6)" : "0 4px 34px rgba(0,0,0,0.5)" } }, l)),
        ].filter(Boolean)),
      !bgDataUrl && input.subCopy && input.subCopy.trim() ? el("div", { style: { position: "absolute", left: 48, right: 48, top: Math.round(SIZE * 0.72), display: "flex", justifyContent: "center", fontFamily: identity.fontPair.body, fontSize: 30, fontWeight: 500, color: "rgba(255,255,255,0.75)" } }, input.subCopy.trim()) : null,
      // 하단 15% — 세이프 존(채널 칩 자리): 의도적으로 빈 공간
    ].filter(Boolean));
    const pressFonts = [
      { name: identity.fontPair.title, data: loadFont(identity.fontPair.title), weight: 900 as const, style: "normal" as const },
      { name: identity.fontPair.body, data: loadFont(identity.fontPair.body), weight: 500 as const, style: "normal" as const },
    ];
    const pressSvg = await satori(pressRoot as unknown as React.ReactNode, { width: SIZE, height: SIZE, fonts: pressFonts });
    return Buffer.from(new Resvg(pressSvg, { fitTo: { mode: "width", value: width } }).render().asPng());
  }


  // z순서: 배경 → backdrop(카피 뒤) → 무대 오브젝트 → 스크림 → 카피(최상단, 항상 위로 가독 보장).
  const root = el("div", { style: { display: "flex", width: SIZE, height: SIZE, position: "relative", overflow: "hidden", backgroundColor: p.bg } },
    [bg,
      bgDataUrl && input.bgWash ? el("div", { style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: p.bg, opacity: Math.min(0.85, Math.max(0, input.bgWash)) } }) : null,
      ...backdrop, ...objects, scrim, copyBlock(input, tpl)].filter(Boolean));

  const fonts = [
    { name: identity.fontPair.title, data: loadFont(identity.fontPair.title), weight: 900 as const, style: "normal" as const },
    { name: identity.fontPair.body, data: loadFont(identity.fontPair.body), weight: 500 as const, style: "normal" as const },
  ];
  const svg = await satori(root as unknown as React.ReactNode, { width: SIZE, height: SIZE, fonts });
  return Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng());
}
