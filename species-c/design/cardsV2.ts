// [species-c] 카드 v2 — 레트로 폐기, 토스 카드뉴스풍 커머스 미니멀(유저 확정 2026-07-14).
// 장식 제로: 스탬프·전표 헤더·이중선·절취선 전부 삭제. 여백과 위계로만. 헤더는 기능 라벨만 작게.
import fs from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const F = (name: string) => fs.readFileSync(path.join(__dirname, "../copied/fonts", name));
const fonts = [
  { name: "Pretendard", data: F("Pretendard-Regular.otf"), weight: 400 as const, style: "normal" as const },
  { name: "Pretendard", data: F("Pretendard-Black.otf"), weight: 800 as const, style: "normal" as const },
];
type Node = { type: string; props: Record<string, unknown> };
const el = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({ type, props: { style: { flexShrink: 0, ...style }, children } });
const txt = (t: string, style: Record<string, unknown>): Node => el("div", style, t);

/** 토큰 v2 */
export const V2 = {
  W: 1200,
  pad: 72, // 카드 내부 여백
  outer: 48, // 캔버스(연회색) 패딩 — 소프트 섀도가 보이는 무대
  color: { canvas: "#F7F8FA", card: "#FFFFFF", ink: "#191F28", sub: "#8B95A1", line: "#F2F4F6", blue: "#3182F6", blueTint: "rgba(49,130,246,0.10)", red: "#F04452", redTint: "rgba(240,68,82,0.10)" },
  radius: 28,
  shadow: "0 4px 24px rgba(0,0,0,0.06)",
  bar: { h: 44, w: 660 },
};
const C = V2.color;

/** 기능 라벨(작게) — 콘셉트 헤더 대체 */
const label = (t: string): Node => txt(t, { fontSize: 26, color: C.sub, marginBottom: 34 });

/** pill 뱃지 — 액센트 10% 틴트 + 액센트 텍스트 */
const pill = (t: string, accent = C.blue, tint = C.blueTint): Node =>
  el("div", { display: "flex", backgroundColor: tint, borderRadius: 999, padding: "12px 26px" }, [
    txt(t, { fontSize: 28, fontWeight: 800, color: accent }),
  ]);

/** 라운드 필 막대 — 트랙 위 수치 라벨 우측 정렬 */
const bar = (labelText: string, num: number, den: number, accent: string): Node => {
  const ratio = Math.max(0.1, Math.min(1, num / Math.max(1, den)));
  return el("div", { display: "flex", flexDirection: "column", marginBottom: 30 }, [
    txt(labelText, { fontSize: 32, fontWeight: 800, color: C.ink, marginBottom: 12 }),
    el("div", { display: "flex", position: "relative", width: V2.bar.w + 240, height: V2.bar.h, alignItems: "center" }, [
      el("div", { display: "flex", width: V2.bar.w, height: V2.bar.h, backgroundColor: C.line, borderRadius: 999 }, [
        el("div", { display: "flex", width: Math.round(V2.bar.w * ratio), height: "100%", backgroundColor: accent, borderRadius: 999 }),
      ]),
      txt(`${den}건 중 ${num}건`, { fontSize: 27, color: C.sub, marginLeft: 22 }),
    ]),
  ]);
};

/** 흰 카드 무대 */
const card = (children: Node[], h: number): Node =>
  el("div", { display: "flex", width: V2.W, height: h, backgroundColor: C.canvas, padding: V2.outer, fontFamily: "Pretendard" }, [
    el("div", { display: "flex", flexDirection: "column", flexGrow: 1, backgroundColor: C.card, borderRadius: V2.radius, boxShadow: V2.shadow, padding: V2.pad, position: "relative" }, children),
  ]);

async function render(node: Node, h: number, file: string): Promise<void> {
  const svg = await satori(node as never, { width: V2.W, height: h, fonts });
  fs.writeFileSync(file, new Resvg(svg, { fitTo: { mode: "width", value: V2.W } }).render().asPng());
}

// ── 1. 리뷰 분석 (1B 히어로 숫자 위계) ─────────────────────────────
export interface ReviewCardData { total: number; sample: number; sat: [string, number][]; bad: [string, number][] }
export async function reviewCardV2(d: ReviewCardData, file: string): Promise<void> {
  const h = 300 + (d.sat.length + d.bad.length) * 122 + 210;
  await render(card([
    label(`실구매 리뷰 ${d.sample}건 분석`),
    el("div", { display: "flex", alignItems: "flex-end", gap: 18, marginBottom: 44 }, [
      txt(String(d.sample), { fontSize: 130, fontWeight: 800, color: C.ink, lineHeight: 0.9 }),
      el("div", { display: "flex", flexDirection: "column", paddingBottom: 10 }, [
        txt("건을 직접 정독했어요", { fontSize: 40, fontWeight: 800, color: C.ink }),
        txt(`전체 리뷰 ${d.total.toLocaleString()}건 상품`, { fontSize: 27, color: C.sub, marginTop: 6 }),
      ]),
    ]),
    ...d.sat.map(([l, n]) => bar(l, n, d.sample, C.blue)),
    el("div", { display: "flex", height: 2, backgroundColor: C.line, margin: "16px 0 34px" }),
    txt("아쉽다는 리뷰", { fontSize: 34, fontWeight: 800, color: C.red, marginBottom: 24 }),
    ...d.bad.map(([l, n]) => bar(l, n, d.sample, C.red)),
  ], h), h, file);
}

// ── 2. CTA (2A 가격 최대 요소) ─────────────────────────────
export interface CtaCardData { name: string; price: number; orig?: number | null; rating: number; total: number; discountPct?: number }
export async function ctaCardV2(d: CtaCardData, file: string): Promise<void> {
  const h = 620;
  await render(card([
    label("구매 정보"),
    txt(d.name.length > 24 ? d.name.slice(0, 24) + "…" : d.name, { fontSize: 44, fontWeight: 800, color: C.ink, marginBottom: 26 }),
    el("div", { display: "flex", alignItems: "flex-end", gap: 24, marginBottom: 36 }, [
      txt(`${d.price.toLocaleString()}원`, { fontSize: 120, fontWeight: 800, color: C.ink, lineHeight: 0.95 }),
      d.orig && d.orig > d.price
        ? el("div", { display: "flex", position: "relative", paddingBottom: 14 }, [
            txt(`${d.orig.toLocaleString()}원`, { fontSize: 34, color: C.sub }),
            el("div", { position: "absolute", left: 0, right: 0, top: "42%", height: 3, backgroundColor: C.sub, display: "flex" }),
          ])
        : el("div", { display: "flex" }),
    ]),
    el("div", { display: "flex", gap: 14, marginBottom: 38 }, [
      pill(`평점 ${d.rating}`),
      pill(`리뷰 ${d.total.toLocaleString()}`),
      ...(d.discountPct ? [pill(`${d.discountPct}% 할인`, C.red, C.redTint)] : []),
    ]),
    txt("가격·재고는 확인 시점에 따라 달라질 수 있어요", { fontSize: 22, color: C.sub }),
  ], h), h, file);
}

// ── 3. 구매 판정표 (3A 2열, 워딩 중립) ─────────────────────────────
export interface JudgeCardData { fit: string[]; no: string[] }
const judgeItem = (t: string, accent: string, tint: string, mark: string): Node =>
  el("div", { display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 26 }, [
    el("div", { display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, backgroundColor: tint, borderRadius: 999 }, [
      txt(mark, { fontSize: 24, fontWeight: 800, color: accent }),
    ]),
    txt(t, { fontSize: 31, color: C.ink, lineHeight: 1.45, maxWidth: 400, paddingTop: 4 }),
  ]);
export async function judgeCardV2(d: JudgeCardData, file: string): Promise<void> {
  const rows = Math.max(d.fit.length, d.no.length);
  const h = 260 + rows * 110 + 140;
  await render(card([
    label("구매 판단 가이드"),
    el("div", { display: "flex", gap: 48 }, [
      el("div", { display: "flex", flexDirection: "column", flexGrow: 1, flexBasis: 0 }, [
        txt("이런 분께 추천해요", { fontSize: 38, fontWeight: 800, color: C.blue, marginBottom: 30 }),
        ...d.fit.map((l) => judgeItem(l, C.blue, C.blueTint, "V")),
      ]),
      el("div", { display: "flex", width: 2, backgroundColor: C.line }),
      el("div", { display: "flex", flexDirection: "column", flexGrow: 1, flexBasis: 0 }, [
        txt("이런 분껜 아쉬워요", { fontSize: 38, fontWeight: 800, color: C.red, marginBottom: 30 }),
        ...d.no.map((l) => judgeItem(l, C.red, C.redTint, "X")),
      ]),
    ]),
  ], h), h, file);
}

// ── 4. 대표이미지 프레임 ─────────────────────────────
export async function productFrameV2(imagePngOrNull: Buffer | null, file: string): Promise<void> {
  const h = 1060;
  const inner = imagePngOrNull
    ? el("img", { width: V2.W - V2.outer * 2 - V2.pad * 2, height: 760, objectFit: "contain", borderRadius: 16 }, undefined)
    : el("div", { display: "flex", width: "100%", height: 760, backgroundColor: C.line, borderRadius: 16, alignItems: "center", justifyContent: "center" }, [
        txt("상품 대표이미지", { fontSize: 32, color: C.sub }),
      ]);
  if (imagePngOrNull) (inner.props as Record<string, unknown>).src = `data:image/png;base64,${imagePngOrNull.toString("base64")}`;
  await render(card([
    inner,
    txt("이미지: 판매 스토어 제공", { fontSize: 22, color: C.sub, marginTop: 28 }),
  ], h), h, file);
}
