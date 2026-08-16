// [species-c] 라운드1 C-3·C-4 — 카드 3종 × 시안 2벌(A=보수, B=실험) + 대표이미지 프레임 1종. 더미 데이터 렌더 → 승인 전 파이프라인 미연결.
import fs from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { T } from "./tokens";

const F = (name: string) => fs.readFileSync(path.join(__dirname, "../copied/fonts", name));
const fonts = [
  { name: "GmarketSansBold", data: F("GmarketSansBold.ttf"), weight: 700 as const, style: "normal" as const },
  { name: "Pretendard", data: F("Pretendard-Regular.otf"), weight: 400 as const, style: "normal" as const },
  { name: "DoHyeon", data: F("DoHyeon.ttf"), weight: 400 as const, style: "normal" as const },
];
type Node = { type: string; props: Record<string, unknown> };
const el = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({ type, props: { style: { flexShrink: 0, ...style }, children } }); // flexShrink 0 — 콘텐츠 초과 시 텍스트 박스가 눌려 겹치는 satori 사고 방지
const txt = (t: string, style: Record<string, unknown>): Node => el("div", style, t);
const C = T.color;

// ── 공용 부품 ─────────────────────────────
/** 도장(이중 테두리 + 15도 기울임) — 추천 카드에만, 카드당 1회 */
const stamp = (label = "이달의 사원 추천"): Node =>
  el("div", { position: "absolute", right: T.margin - 10, bottom: T.margin - 16, transform: "rotate(-15deg)", display: "flex", padding: 6, border: `4px solid ${C.blue}`, borderRadius: 14, opacity: 0.9 }, [
    el("div", { display: "flex", padding: "10px 22px", border: `2px solid ${C.blue}`, borderRadius: 9 }, [
      txt(label, { fontFamily: "DoHyeon", fontSize: 34, color: C.blue, letterSpacing: 2 }),
    ]),
  ]);

/** 보수(A) 헤더 — 이중 괘선 전표, 브랜드는 데이터보다 작게 */
const headerA = (right: string): Node =>
  el("div", { display: "flex", flexDirection: "column", marginBottom: T.gap - 8 }, [
    el("div", { display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 14 }, [
      txt("박카상사 상품분석실", { fontFamily: "DoHyeon", fontSize: 38, color: C.ink, letterSpacing: 3 }),
      txt(right, { fontFamily: "Pretendard", fontSize: T.font.caption, color: C.ink, opacity: 0.65 }),
    ]),
    el("div", { display: "flex", height: 5, backgroundColor: C.ink }),
    el("div", { display: "flex", height: 2, backgroundColor: C.ink, marginTop: 4 }),
  ]);

/** 실험(B) 헤더 — 잉크 블록 + 문서번호 태그 */
const headerB = (right: string): Node =>
  el("div", { display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: C.ink, margin: -T.margin, marginBottom: T.gap, padding: `28px ${T.margin}px` }, [
    txt("박카상사 상품분석실", { fontFamily: "DoHyeon", fontSize: 40, color: C.bg, letterSpacing: 4 }),
    el("div", { display: "flex", border: `2px solid ${C.bg}`, padding: "8px 16px", borderRadius: 6 }, [
      txt(right, { fontFamily: "DoHyeon", fontSize: 24, color: C.bg }),
    ]),
  ]);

/** 가로 막대(비율) — 만족=그린, 불만=레드, 우측 "30건 중 14건" */
const bar = (label: string, num: number, den: number, color: string, exp = false): Node => {
  const ratio = Math.max(0.08, Math.min(1, num / Math.max(1, den)));
  return el("div", { display: "flex", flexDirection: "column", marginBottom: 26 }, [
    txt(label, { fontFamily: "GmarketSansBold", fontSize: T.font.body, color: C.ink, marginBottom: 10 }),
    el("div", { display: "flex", alignItems: "center", gap: 18 }, [
      el("div", { display: "flex", width: T.bar.w, height: T.bar.h, backgroundColor: exp ? C.bg : "#EFE7D2", border: `2px solid ${C.line}`, borderRadius: exp ? 0 : 8 }, [
        el("div", { display: "flex", width: Math.round(T.bar.w * ratio), height: "100%", backgroundColor: color, borderRadius: exp ? 0 : 6 }),
      ]),
      txt(`${den}건 중 ${num}건`, { fontFamily: "Pretendard", fontSize: 28, color: C.ink, opacity: 0.8 }),
    ]),
  ]);
};

async function render(node: Node, w: number, h: number, file: string): Promise<void> {
  const svg = await satori(node as never, { width: w, height: h, fonts });
  fs.writeFileSync(file, new Resvg(svg, { fitTo: { mode: "width", value: w } }).render().asPng());
}
const canvas = (children: Node[], h = T.H, pad = T.margin): Node =>
  el("div", { display: "flex", flexDirection: "column", width: T.W, height: h, backgroundColor: C.bg, padding: pad, position: "relative", fontFamily: "Pretendard" }, children);

// ── 더미 데이터 (실측 형식 그대로) ─────────────────────────────
const D = {
  total: 3128, sample: 30,
  sat: [["건조가 잘 되고 금방 마른다", 21], ["냄새 제거·살균 효과", 14], ["소음이 적은 편", 9]] as [string, number][],
  bad: [["향이나 초기 화학 냄새 부담", 5], ["완전 무음은 아님", 3]] as [string, number][],
  name: "보아르 슈즈쏙 신발 건조기", price: 39800, orig: 45000, rating: 4.8,
  fit: ["장마철 젖은 신발이 매일 생긴다면", "아이 실내화를 자주 빨아 신긴다면", "셀프 세탁 후 자연건조가 늦어 곤란하다면"],
  no: ["무음에 가까운 조용함이 필요하시다면", "부츠 전용 건조를 원하신다면"],
};

// ── 1. 리뷰 분석 카드 ─────────────────────────────
async function reviewA(file: string) {
  await render(canvas([
    headerA("분석 문서 No.001"),
    txt(`전체 ${D.total.toLocaleString()}건 중 ${D.sample}건 정독`, { fontFamily: "GmarketSansBold", fontSize: T.font.title, color: C.ink, marginBottom: 34 }),
    ...D.sat.map(([l, n]) => bar(l, n, D.sample, C.green)),
    el("div", { display: "flex", height: 2, backgroundColor: C.line, margin: "10px 0 30px" }),
    txt("아쉽다는 얘기", { fontFamily: "GmarketSansBold", fontSize: 38, color: C.red, marginBottom: 22 }),
    ...D.bad.map(([l, n]) => bar(l, n, D.sample, C.red)),
  ], 1160), T.W, 1160, file);
}
async function reviewB(file: string) {
  await render(canvas([
    headerB("표본 30건"),
    el("div", { display: "flex", alignItems: "flex-end", gap: 20, marginBottom: 40 }, [
      txt(String(D.sample), { fontFamily: "GmarketSansBold", fontSize: T.font.display, color: C.ink, lineHeight: 0.9 }),
      el("div", { display: "flex", flexDirection: "column", paddingBottom: 16 }, [
        txt("건을 직접 정독했습니다", { fontFamily: "GmarketSansBold", fontSize: 36, color: C.ink }),
        txt(`전체 리뷰 ${D.total.toLocaleString()}건 상품`, { fontSize: 26, color: C.ink, opacity: 0.6 }),
      ]),
    ]),
    ...D.sat.map(([l, n]) => bar(l, n, D.sample, C.green, true)),
    el("div", { display: "flex", alignItems: "center", gap: 12, margin: "6px 0 24px" }, [
      el("div", { display: "flex", flexGrow: 1, borderTop: `3px dashed ${C.line}` }),
      txt("절취선 아래는 단점입니다", { fontFamily: "DoHyeon", fontSize: 22, color: C.ink, opacity: 0.5 }),
      el("div", { display: "flex", flexGrow: 1, borderTop: `3px dashed ${C.line}` }),
    ]),
    ...D.bad.map(([l, n]) => bar(l, n, D.sample, C.red, true)),
  ], 1160), T.W, 1160, file);
}

// ── 2. CTA 카드 ─────────────────────────────
async function ctaA(file: string) {
  await render(canvas([
    headerA("오늘의 결재"),
    txt(D.name, { fontFamily: "GmarketSansBold", fontSize: T.font.title, color: C.ink, marginTop: 8, marginBottom: 30 }),
    el("div", { display: "flex", alignItems: "flex-end", gap: 26, marginBottom: 30 }, [
      txt(`${D.price.toLocaleString()}원`, { fontFamily: "GmarketSansBold", fontSize: T.font.display, color: C.red, lineHeight: 0.95 }),
      el("div", { display: "flex", flexDirection: "column", paddingBottom: 18 }, [
        el("div", { display: "flex", position: "relative" }, [
          txt(`${D.orig.toLocaleString()}원`, { fontSize: 34, color: C.ink, opacity: 0.45 }),
          el("div", { position: "absolute", left: 0, right: 0, top: "52%", height: 3, backgroundColor: C.red, opacity: 0.7, display: "flex" }),
        ]),
      ]),
    ]),
    el("div", { display: "flex", gap: 14, marginBottom: 34 }, [
      el("div", { display: "flex", border: `2px solid ${C.ink}`, borderRadius: 999, padding: "10px 24px" }, [txt(`평점 ${D.rating}`, { fontFamily: "GmarketSansBold", fontSize: 28, color: C.ink })]),
      el("div", { display: "flex", border: `2px solid ${C.ink}`, borderRadius: 999, padding: "10px 24px" }, [txt(`리뷰 ${D.total.toLocaleString()}건`, { fontFamily: "GmarketSansBold", fontSize: 28, color: C.ink })]),
      el("div", { display: "flex", backgroundColor: C.green, borderRadius: 999, padding: "12px 24px" }, [txt("깐깐 검수 통과", { fontFamily: "GmarketSansBold", fontSize: 28, color: C.bg })]),
    ]),
    txt("가격·재고는 확인 시점에 따라 달라질 수 있습니다", { fontSize: Math.round(T.font.body * 0.6), color: C.ink, opacity: 0.55 }),
    stamp(),
  ], 760), T.W, 760, file);
}
async function ctaB(file: string) {
  await render(el("div", { display: "flex", width: T.W, height: 760, backgroundColor: C.bg, fontFamily: "Pretendard", position: "relative" }, [
    el("div", { display: "flex", flexDirection: "column", justifyContent: "center", width: 460, backgroundColor: C.ink, padding: 48 }, [
      txt("오늘의", { fontFamily: "DoHyeon", fontSize: 40, color: C.bg, opacity: 0.7 }),
      txt("결재가", { fontFamily: "DoHyeon", fontSize: 40, color: C.bg, opacity: 0.7 }),
      txt("떨어진 가격", { fontFamily: "DoHyeon", fontSize: 44, color: C.bg, marginBottom: 30 }),
      txt(`${D.price.toLocaleString()}`, { fontFamily: "GmarketSansBold", fontSize: 120, color: "#F5C34D", lineHeight: 0.95 }),
      txt("원", { fontFamily: "GmarketSansBold", fontSize: 44, color: C.bg }),
    ]),
    el("div", { display: "flex", flexDirection: "column", justifyContent: "center", flexGrow: 1, padding: 56 }, [
      txt("박카상사 상품분석실", { fontFamily: "DoHyeon", fontSize: 30, color: C.ink, opacity: 0.6, letterSpacing: 3, marginBottom: 18 }),
      txt(D.name, { fontFamily: "GmarketSansBold", fontSize: 50, color: C.ink, marginBottom: 28 }),
      txt(`평점 ${D.rating} · 리뷰 ${D.total.toLocaleString()}건`, { fontFamily: "GmarketSansBold", fontSize: 34, color: C.green, marginBottom: 16 }),
      txt(`정가 대비 ${Math.round((1 - D.price / D.orig) * 100)}% 낮은 확인가`, { fontSize: 30, color: C.ink, opacity: 0.75, marginBottom: 40 }),
      txt("가격·재고는 확인 시점에 따라 달라질 수 있습니다", { fontSize: 20, color: C.ink, opacity: 0.5 }),
    ]),
    stamp(),
  ]), T.W, 760, file);
}

// ── 3. 구매 판정표 카드 (스탬프 없음 — 중립 문서) ─────────────────────────────
const judgeCol = (title: string, color: string, mark: "check" | "x", lines: string[]): Node =>
  el("div", { display: "flex", flexDirection: "column", flexGrow: 1, flexBasis: 0 }, [
    txt(title, { fontFamily: "GmarketSansBold", fontSize: 40, color, marginBottom: 28 }),
    ...lines.map((l) =>
      el("div", { display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24 }, [
        el("div", { display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, border: `3px solid ${color}`, borderRadius: mark === "check" ? 8 : 999, flexShrink: 0 }, [
          txt(mark === "check" ? "V" : "X", { fontFamily: "GmarketSansBold", fontSize: 26, color }),
        ]),
        txt(l, { fontSize: T.font.body, color: C.ink, lineHeight: 1.4, maxWidth: 420 }),
      ]),
    ),
  ]);
async function judgeA(file: string) {
  await render(canvas([
    headerA("구매 판정표"),
    txt("깐깐하게 갈라 드립니다", { fontFamily: "GmarketSansBold", fontSize: T.font.title, color: C.ink, marginBottom: 40 }),
    el("div", { display: "flex", gap: 40 }, [
      judgeCol("이런 분께 맞습니다", C.green, "check", D.fit),
      el("div", { display: "flex", width: 2, backgroundColor: C.line }),
      judgeCol("다시 생각하세요", C.red, "x", D.no),
    ]),
  ]), T.W, T.H, file);
}
async function judgeB(file: string) {
  await render(canvas([
    headerB("구매 판정표"),
    el("div", { display: "flex", flexDirection: "column", backgroundColor: "#EFE7D2", border: `3px solid ${C.green}`, borderRadius: 18, padding: 36, marginBottom: 30 }, [
      txt("사세요", { fontFamily: "DoHyeon", fontSize: 46, color: C.green, marginBottom: 20 }),
      ...D.fit.map((l) => txt(`V  ${l}`, { fontFamily: "GmarketSansBold", fontSize: T.font.body, color: C.ink, marginBottom: 14 })),
    ]),
    el("div", { display: "flex", flexDirection: "column", border: `3px dashed ${C.red}`, borderRadius: 18, padding: 36 }, [
      txt("못 팝니다", { fontFamily: "DoHyeon", fontSize: 46, color: C.red, marginBottom: 20 }),
      ...D.no.map((l) => txt(`X  ${l}`, { fontFamily: "GmarketSansBold", fontSize: T.font.body, color: C.ink, marginBottom: 14 })),
    ]),
  ]), T.W, T.H, file);
}

// ── 4. 대표이미지 프레임(C-1) — 더미 자리에 회색 박스 ─────────────────────────────
async function productFrame(file: string) {
  await render(el("div", { display: "flex", flexDirection: "column", width: T.W, height: 1000, backgroundColor: C.bg, padding: 52, position: "relative", fontFamily: "Pretendard" }, [
    el("div", { display: "flex", flexGrow: 1, backgroundColor: "#E8E2D2", border: `3px solid ${C.line}`, borderRadius: 10, alignItems: "center", justifyContent: "center" }, [
      txt("상품 대표이미지 (쇼핑 API 원본)", { fontSize: 34, color: C.ink, opacity: 0.4 }),
    ]),
    el("div", { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 30 }, [
      txt("박카상사 취급 상품", { fontFamily: "DoHyeon", fontSize: 32, color: C.ink, letterSpacing: 2 }),
      txt("이미지 출처: 판매 스토어", { fontSize: 24, color: C.ink, opacity: 0.55 }),
    ]),
    stamp(),
  ]), T.W, 1000, file);
}

async function main() {
  const out = path.join(__dirname, "../out/design-drafts");
  fs.mkdirSync(out, { recursive: true });
  await reviewA(path.join(out, "1A_리뷰분석_보수.png"));
  await reviewB(path.join(out, "1B_리뷰분석_실험.png"));
  await ctaA(path.join(out, "2A_CTA_보수.png"));
  await ctaB(path.join(out, "2B_CTA_실험.png"));
  await judgeA(path.join(out, "3A_판정표_보수.png"));
  await judgeB(path.join(out, "3B_판정표_실험.png"));
  await productFrame(path.join(out, "4_대표이미지_프레임.png"));
  console.log("시안 7장 렌더링 완료:", out);
}
main().catch((e) => { console.error(e); process.exit(1); });
