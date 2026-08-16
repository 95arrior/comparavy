// ★데이터 카드 — 글의 핵심 수치를 카드 이미지로(장식 아님, 글 내용이 이미지가 됨).
//  유저 팔레트·폰트 시드를 그대로 써서 썸네일과 같은 시각 시그니처(블로그 브랜딩). 배경=코드 생성(AI 0).
//  라벨+값 구조, 한 카드 3항목 이내, 한글·숫자만(이모지·기호 금지 — 호출측이 값 정제).

import fs from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { visualIdentityFor } from "./visualIdentity";

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const FONT_FILES: Record<string, string> = {
  "Pretendard-Black": "Pretendard-Black.otf", "Pretendard-Bold": "Pretendard-Bold.otf",
  "Pretendard-SemiBold": "Pretendard-SemiBold.otf", "Pretendard-Regular": "Pretendard-Regular.otf",
  "GowunBatang-Bold": "GowunBatang-Bold.ttf", "Jua": "Jua.ttf", "DoHyeon": "DoHyeon.ttf", "BlackHanSans": "BlackHanSans.ttf",
};
const cache = new Map<string, Buffer>();
function loadFont(name: string): Buffer {
  const f = FONT_FILES[name] ?? FONT_FILES["Pretendard-Bold"];
  if (!cache.has(f)) cache.set(f, fs.readFileSync(path.join(FONT_DIR, f)));
  return cache.get(f)!;
}
function shade(hex: string, pct: number): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex); if (!m) return hex;
  const adj = (h: string) => Math.max(0, Math.min(255, parseInt(h, 16) + Math.round(255 * (pct / 100)))).toString(16).padStart(2, "0");
  return `#${adj(m[1])}${adj(m[2])}${adj(m[3])}`;
}
function lum(hex: string): number { const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex); if (!m) return 1; const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }

export interface CardItem { label: string; value: string }
// 한글·숫자·기본기호만 남기고 이모지/장식 제거(구조적).
function cleanText(s: string): string {
  return (s ?? "").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}]/gu, "").trim();
}

const W = 1000, H = 620;
type El = { type: string; props: Record<string, unknown> };
const el = (type: string, props: Record<string, unknown> = {}, children?: unknown): El => ({ type, props: { ...props, ...(children !== undefined ? { children } : {}) } });

/** 데이터 카드 PNG(비동기). items(≤3) + userId(팔레트·폰트 시드). 값은 '글에서 추출한 실제 값'만. */
export async function renderDataCard(items: CardItem[], userId: string, width = W): Promise<Buffer> {
  const id = visualIdentityFor(userId);
  const p = id.palette, ft = id.fontPair.title, fb = id.fontPair.body;
  const rows = items.slice(0, 3).map((it) => ({ label: cleanText(it.label).slice(0, 20), value: cleanText(it.value).slice(0, 28) })).filter((r) => r.value);
  if (rows.length === 0) throw new Error("no rows");
  const dark = lum(p.bg) < 0.45;

  const rowEls = rows.map((r, i) => el("div", { style: { display: "flex", flexDirection: "column", gap: 8, paddingTop: i === 0 ? 0 : 26, marginTop: i === 0 ? 0 : 26, borderTop: i === 0 ? "0px solid transparent" : `2px solid ${p.title}22` } }, [
    el("div", { style: { display: "flex", fontFamily: fb, fontSize: 30, fontWeight: 600, color: p.title, opacity: 0.62, letterSpacing: -0.5 } }, r.label),
    el("div", { style: { display: "flex", alignItems: "center", gap: 18 } }, [
      el("div", { style: { display: "flex", width: 10, height: 46, borderRadius: 6, background: p.point } }),
      el("div", { style: { display: "flex", fontFamily: ft, fontSize: 58, fontWeight: 900, color: p.title, letterSpacing: -1.5, wordBreak: "keep-all" } }, r.value),
    ]),
  ]));
  const root = el("div", { style: {
    display: "flex", flexDirection: "column", justifyContent: "center", width: W, height: H,
    padding: "70px 76px", backgroundImage: `linear-gradient(160deg, ${shade(p.bg, dark ? 7 : 5)}, ${shade(p.bg, dark ? -9 : -7)})`, fontFamily: ft,
  } }, rowEls);
  const fonts = [
    { name: ft, data: loadFont(ft), weight: 900 as const, style: "normal" as const },
    { name: fb, data: loadFont(fb), weight: 600 as const, style: "normal" as const },
  ];
  const svg = await satori(root as unknown as React.ReactNode, { width: W, height: H, fonts });
  return Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng());
}
