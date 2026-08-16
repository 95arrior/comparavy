// [species-c] §8 이미지 카드 — HTML/CSS(satori) → PNG. LLM 이미지 생성 금지. 데이터는 전부 실측에서.
// 박카상사 레트로 톤: 크림 배경 + 잉크 텍스트 + 스탬프 요소. 상품 사진·로고 없음(전부 텍스트·도형 오리지널).
import fs from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { CARD } from "./config";
import type { Product, ReviewMining } from "./types";

const F = (name: string) => fs.readFileSync(path.join(__dirname, "copied/fonts", name));
const fonts = [
  { name: "GmarketSansBold", data: F("GmarketSansBold.ttf"), weight: 700 as const, style: "normal" as const },
  { name: "Pretendard", data: F("Pretendard-Regular.otf"), weight: 400 as const, style: "normal" as const },
  { name: "DoHyeon", data: F("DoHyeon.ttf"), weight: 400 as const, style: "normal" as const },
];

type Node = { type: string; props: Record<string, unknown> };
const el = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({ type, props: { style, children } });
const txt = (t: string, style: Record<string, unknown>): Node => el("div", style, t);

const P = CARD.palette;

function frame(headerRight: string, children: Node[], height: number): Node {
  return el("div", { display: "flex", flexDirection: "column", width: CARD.width, height, backgroundColor: P.bg, border: `6px solid ${P.ink}`, fontFamily: "Pretendard" }, [
    // 90년대 전표 헤더
    el("div", { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 28px", borderBottom: `4px solid ${P.ink}`, backgroundColor: P.ink }, [
      txt(CARD.headerLabel, { fontFamily: "DoHyeon", fontSize: 30, color: P.bg, letterSpacing: 2 }),
      txt(headerRight, { fontFamily: "DoHyeon", fontSize: 24, color: "#F5C34D" }),
    ]),
    el("div", { display: "flex", flexDirection: "column", flexGrow: 1, padding: "26px 30px", position: "relative" }, [
      ...children,
      // 스탬프
      el("div", { position: "absolute", right: 26, bottom: 20, display: "flex", alignItems: "center", justifyContent: "center", width: 148, height: 58, border: `3px solid ${P.stamp}`, borderRadius: 10, transform: "rotate(-7deg)", opacity: 0.85 }, [
        txt(CARD.stampLabel, { fontFamily: "DoHyeon", fontSize: 21, color: P.stamp }),
      ]),
    ]),
  ]);
}

const row = (label: string, value: string, accent = false): Node =>
  el("div", { display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }, [
    el("div", { display: "flex", width: 12, height: 12, backgroundColor: accent ? P.accent : P.ink, marginTop: 2 }),
    txt(label, { fontFamily: "GmarketSansBold", fontSize: 26, color: accent ? P.accent : P.ink, maxWidth: 560 }),
    value ? txt(value, { fontSize: 24, color: P.sub, marginLeft: "auto", paddingRight: 8 }) : el("div", { display: "flex" }),
  ]);

async function render(node: Node, height: number, file: string): Promise<void> {
  const svg = await satori(node as never, { width: CARD.width, height, fonts });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: CARD.width } }).render().asPng();
  fs.writeFileSync(file, png);
}

export async function renderReviewCard(p: Product, r: ReviewMining, file: string): Promise<void> {
  // ★A-3(라운드1): 절대 횟수 금지 — 표본<30이면 정성 라벨, 이상이면 "표본 중 N건" 비율. 헤더는 표본 선언.
  const label = (m: number) => (r.sampleSize >= 30 ? `${r.sampleSize}건 중 ${m}건` : m / Math.max(1, r.sampleSize) >= 0.5 ? "가장 자주 언급" : m / Math.max(1, r.sampleSize) >= 0.25 ? "여러 건에서 반복" : "일부 언급");
  const h = 560;
  await render(frame(`전체 ${p.reviewCount.toLocaleString()}건 중 ${r.sampleSize}건 정독`, [
    txt("실구매자가 말하는 만족 포인트", { fontFamily: "GmarketSansBold", fontSize: 32, color: P.ink, marginBottom: 20 }),
    ...r.satisfactionTop3.map((s, i) => row(`${i + 1}. ${s.point}`, label(s.mentions))),
    el("div", { display: "flex", height: 3, backgroundColor: P.ink, opacity: 0.15, margin: "14px 0 18px" }),
    txt("아쉽다는 얘기도 있습니다", { fontFamily: "GmarketSansBold", fontSize: 27, color: P.accent, marginBottom: 14 }),
    ...r.complaintsTop2.map((c) => row(c.point, label(c.mentions), true)),
  ], h), h, file);
}

export async function renderChecklistCard(fitLines: string[], noLines: string[], file: string): Promise<void> {
  const h = 150 + (fitLines.length + noLines.length) * 46 + 150;
  await render(frame("구매 판정표", [
    txt("이런 분께 맞습니다", { fontFamily: "GmarketSansBold", fontSize: 30, color: P.ink, marginBottom: 16 }),
    ...fitLines.map((l) => row(l, "")),
    el("div", { display: "flex", height: 3, backgroundColor: P.ink, opacity: 0.15, margin: "12px 0 16px" }),
    txt("이런 분은 다시 생각하세요", { fontFamily: "GmarketSansBold", fontSize: 27, color: P.accent, marginBottom: 14 }),
    ...noLines.map((l) => row(l, "", true)),
  ], h), h, file);
}

export async function renderCtaCard(p: Product, file: string): Promise<void> {
  const h = 420;
  await render(frame("오늘의 결재", [
    txt(p.name.length > 26 ? p.name.slice(0, 26) + "…" : p.name, { fontFamily: "GmarketSansBold", fontSize: 34, color: P.ink, marginBottom: 22, maxWidth: 780 }),
    el("div", { display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }, [
      txt(`${p.price.toLocaleString()}원`, { fontFamily: "GmarketSansBold", fontSize: 56, color: P.accent }),
      p.discountPct ? txt(`할인 ${p.discountPct}% 적용가`, { fontSize: 24, color: P.sub, marginBottom: 8 }) : el("div", { display: "flex" }),
    ]),
    txt(`평점 ${p.rating} · 리뷰 ${p.reviewCount.toLocaleString()}건`, { fontSize: 26, color: P.sub }),
    txt("가격과 재고는 확인 시점에 따라 달라질 수 있습니다", { fontSize: 20, color: P.sub, marginTop: 14, opacity: 0.8 }),
  ], h), h, file);
}

export async function renderCompareCard(rows: { label: string; a: string; b: string }[], nameA: string, nameB: string, file: string): Promise<void> {
  const h = 190 + rows.length * 56 + 130;
  const cell = (t: string, w: number, bold = false, color = P.ink): Node => txt(t, { width: w, fontSize: bold ? 24 : 22, fontFamily: bold ? "GmarketSansBold" : "Pretendard", color, padding: "10px 8px" });
  await render(frame("비교 전표", [
    el("div", { display: "flex", borderBottom: `4px solid ${P.ink}` }, [cell("항목", 200, true), cell(nameA.slice(0, 14), 300, true), cell(nameB.slice(0, 14), 300, true, P.accent)]),
    ...rows.map((r) => el("div", { display: "flex", borderBottom: `2px solid rgba(43,33,23,.15)` }, [cell(r.label, 200, true), cell(r.a, 300), cell(r.b, 300)])),
  ], h), h, file);
}
