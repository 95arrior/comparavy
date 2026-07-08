// ★인포그래픽 렌더러 — "AI 그림"이 아니라 "운영자가 공들여 만든 자료" 문법(유저 레퍼런스: 한국부동산원 차트·체크리스트 카드).
//  본문의 실데이터(표·체크리스트)를 코드로 그린다 — 텍스트 선명(satori), 원가 0(크레딧 0), 16:9 (1280×720).
import fs from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const W = 1280, H = 720;
const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const cache = new Map<string, Buffer>();
function font(file: string): Buffer {
  if (!cache.has(file)) cache.set(file, fs.readFileSync(path.join(FONT_DIR, file)));
  return cache.get(file)!;
}
const FONTS = () => [
  { name: "T", data: font("Pretendard-Black.otf"), weight: 900 as const, style: "normal" as const },
  { name: "B", data: font("Pretendard-Bold.otf"), weight: 700 as const, style: "normal" as const },
  { name: "R", data: font("Pretendard-Regular.otf"), weight: 400 as const, style: "normal" as const },
];

type El = { type: string; props: Record<string, unknown> };
function el(type: string, props: Record<string, unknown> = {}, children?: unknown): El {
  return { type, props: { ...props, ...(children !== undefined ? { children } : {}) } };
}

const INK = "#191F28", SUB = "#4E5968", WEAK = "#8B95A1", LINE = "#E5E8EB", BLUE = "#1D75F7", RED = "#F04452", BG = "#FFFFFF";

async function toPng(root: El): Promise<Buffer> {
  const svg = await satori(root as unknown as React.ReactNode, { width: W, height: H, fonts: FONTS() });
  return Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng());
}

function frame(title: string, brand: string, body: El[], sourceNote?: string): El {
  return el("div", { style: { display: "flex", flexDirection: "column", width: W, height: H, backgroundColor: BG, padding: "44px 56px 36px" } }, [
    el("div", { style: { display: "flex", alignItems: "center", gap: 12 } }, [
      el("div", { style: { display: "flex", width: 8, height: 30, backgroundColor: BLUE, borderRadius: 3 } }),
      el("div", { style: { display: "flex", fontFamily: "T", fontSize: 40, fontWeight: 900, color: INK, letterSpacing: -1 } }, title),
    ]),
    el("div", { style: { display: "flex", flexDirection: "column", flexGrow: 1, marginTop: 26 } }, body),
    el("div", { style: { display: "flex", justifyContent: "space-between", marginTop: 18, borderTop: `2px solid ${LINE}`, paddingTop: 14 } }, [
      el("div", { style: { display: "flex", fontFamily: "R", fontSize: 19, color: WEAK } }, sourceNote ?? ""),
      el("div", { style: { display: "flex", fontFamily: "B", fontSize: 19, color: WEAK, letterSpacing: 3 } }, brand),
    ]),
  ]);
}

/* ── 1) 비교 막대 차트(부동산원 트윈바 문법) — 그룹별 1~2 시리즈 ── */
export interface BarGroup { label: string; values: number[] } // values 1~2개
export async function renderBarChart(opts: { title: string; unit?: string; seriesNames: string[]; groups: BarGroup[]; brand: string; source?: string }): Promise<Buffer> {
  const groups = opts.groups.slice(0, 6);
  const maxVal = Math.max(...groups.flatMap((g) => g.values.map((v) => Math.abs(v))), 0.0001);
  const colors = [BLUE, RED];
  const plotH = 380;
  const legend = el("div", { style: { display: "flex", gap: 22, justifyContent: "flex-end" } },
    opts.seriesNames.slice(0, 2).map((n, i) => el("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, [
      el("div", { style: { display: "flex", width: 18, height: 18, backgroundColor: colors[i], borderRadius: 4 } }),
      el("div", { style: { display: "flex", fontFamily: "B", fontSize: 22, color: SUB } }, n),
    ])));
  const bars = el("div", { style: { display: "flex", alignItems: "flex-end", justifyContent: "space-around", height: plotH, marginTop: 18, borderBottom: `3px solid ${INK}`, paddingBottom: 0 } },
    groups.map((g) => el("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 0 } }, [
      el("div", { style: { display: "flex", alignItems: "flex-end", gap: 10 } },
        g.values.slice(0, 2).map((v, i) => {
          const h = Math.max(10, Math.round((Math.abs(v) / maxVal) * (plotH - 90)));
          return el("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 } }, [
            el("div", { style: { display: "flex", fontFamily: "T", fontSize: 24, color: colors[i] } }, String(v)),
            el("div", { style: { display: "flex", width: 52, height: h, backgroundColor: colors[i], borderTopLeftRadius: 6, borderTopRightRadius: 6 } }),
          ]);
        })),
    ])));
  const labels = el("div", { style: { display: "flex", justifyContent: "space-around", marginTop: 12 } },
    groups.map((g) => el("div", { style: { display: "flex", fontFamily: "B", fontSize: 24, color: INK } }, g.label)));
  const unit = opts.unit ? el("div", { style: { display: "flex", justifyContent: "flex-end", fontFamily: "R", fontSize: 20, color: WEAK } }, `(단위: ${opts.unit})`) : el("div", { style: { display: "flex" } });
  return toPng(frame(opts.title, opts.brand, [unit, legend, bars, labels], opts.source));
}

/* ── 2) 비교 표 카드 — 본문 <table> 실데이터를 선명한 이미지로 ── */
export async function renderTableCard(opts: { title: string; headers: string[]; rows: string[][]; brand: string; source?: string }): Promise<Buffer> {
  const headers = opts.headers.slice(0, 4);
  const rows = opts.rows.slice(0, 6).map((r) => r.slice(0, 4));
  const colCount = Math.max(headers.length, 1);
  const fs1 = rows.length >= 5 || colCount >= 4 ? 24 : 28;
  const head = el("div", { style: { display: "flex", backgroundColor: "#F2F6FF", borderRadius: 12 } },
    headers.map((h) => el("div", { style: { display: "flex", flex: 1, justifyContent: "center", padding: "18px 10px", fontFamily: "T", fontSize: fs1, color: BLUE } }, h)));
  const body = rows.map((r, ri) => el("div", { style: { display: "flex", borderBottom: ri === rows.length - 1 ? "none" : `2px solid ${LINE}` } },
    r.map((c, ci) => el("div", { style: { display: "flex", flex: 1, justifyContent: "center", textAlign: "center", padding: "17px 10px", fontFamily: ci === 0 ? "B" : "R", fontSize: fs1, color: ci === 0 ? INK : SUB, wordBreak: "keep-all" } }, c))));
  return toPng(frame(opts.title, opts.brand, [head, ...body], opts.source));
}

/* ── 3) 체크리스트 카드 — ☐ 절차를 카드형 자료로 ── */
export async function renderChecklistCard(opts: { title: string; items: string[]; brand: string }): Promise<Buffer> {
  const items = opts.items.slice(0, 6);
  const fs1 = items.length >= 5 ? 26 : 30;
  const rows = items.map((t, i) => el("div", { style: { display: "flex", alignItems: "center", gap: 18, backgroundColor: "#F7F8FA", borderRadius: 14, padding: "20px 24px", marginTop: i === 0 ? 0 : 14 } }, [
    el("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 10, backgroundColor: BLUE, fontFamily: "T", fontSize: 22, color: "#FFF" } }, String(i + 1)),
    el("div", { style: { display: "flex", fontFamily: "B", fontSize: fs1, color: INK, wordBreak: "keep-all", flex: 1 } }, t),
  ]));
  return toPng(frame(opts.title, opts.brand, [el("div", { style: { display: "flex", flexDirection: "column", justifyContent: "center", flexGrow: 1 } }, rows)]));
}

/* ── 4) 핵심 수치 카드(a) — 큰 숫자 1개가 주인공(벤치마크: 스크롤만 해도 숫자가 읽힌다) ── */
export async function renderStatCard(opts: { title: string; value: string; label: string; subs?: string[]; brand: string }): Promise<Buffer> {
  const subs = (opts.subs ?? []).slice(0, 2);
  const body = el("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexGrow: 1, gap: 10 } }, [
    el("div", { style: { display: "flex", fontFamily: "T", fontSize: 128, fontWeight: 900, color: BLUE, letterSpacing: -4, lineHeight: 1 } }, opts.value),
    el("div", { style: { display: "flex", fontFamily: "B", fontSize: 34, color: INK, marginTop: 6 } }, opts.label),
    ...subs.map((t) => el("div", { style: { display: "flex", fontFamily: "R", fontSize: 24, color: SUB, marginTop: 2 } }, t)),
  ]);
  return toPng(frame(opts.title, opts.brand, [body]));
}

/* ── 5) 전후 비교 카드(b) — 기존 vs 확대(변경·개정 글 전용) ── */
export interface BeforeAfterRow { label: string; before: string; after: string }
export async function renderBeforeAfterCard(opts: { title: string; beforeHead?: string; afterHead?: string; rows: BeforeAfterRow[]; brand: string }): Promise<Buffer> {
  const rows = opts.rows.slice(0, 4);
  const fs1 = rows.length >= 3 ? 27 : 32;
  const header = el("div", { style: { display: "flex", marginTop: 4 } }, [
    el("div", { style: { display: "flex", flex: 1 } }),
    el("div", { style: { display: "flex", flex: 1.2, justifyContent: "center", fontFamily: "B", fontSize: 24, color: WEAK } }, opts.beforeHead ?? "기존"),
    el("div", { style: { display: "flex", width: 56 } }),
    el("div", { style: { display: "flex", flex: 1.2, justifyContent: "center", fontFamily: "T", fontSize: 24, color: BLUE } }, opts.afterHead ?? "변경 후"),
  ]);
  const lines = rows.map((r, i) => el("div", { style: { display: "flex", alignItems: "center", padding: "22px 0", borderBottom: i === rows.length - 1 ? "none" : `2px solid ${LINE}` } }, [
    el("div", { style: { display: "flex", flex: 1, fontFamily: "B", fontSize: fs1 - 3, color: INK } }, r.label),
    el("div", { style: { display: "flex", flex: 1.2, justifyContent: "center", fontFamily: "R", fontSize: fs1, color: WEAK, textDecoration: "line-through" } }, r.before),
    el("div", { style: { display: "flex", width: 56, justifyContent: "center", fontFamily: "T", fontSize: fs1, color: BLUE } }, "→"),
    el("div", { style: { display: "flex", flex: 1.2, justifyContent: "center", fontFamily: "T", fontSize: fs1 + 4, color: BLUE } }, r.after),
  ]));
  return toPng(frame(opts.title, opts.brand, [el("div", { style: { display: "flex", flexDirection: "column", justifyContent: "center", flexGrow: 1 } }, [header, ...lines])]));
}

/* ── 6) 구성/비중 카드(c) — 항목별 가로 바(예산·구성 글 전용) ── */
export interface CompositionItem { label: string; value: number; valueText: string }
export async function renderCompositionCard(opts: { title: string; items: CompositionItem[]; brand: string }): Promise<Buffer> {
  const items = opts.items.slice(0, 5);
  const maxVal = Math.max(...items.map((i) => Math.abs(i.value)), 0.0001);
  const rows = items.map((it, i) => {
    const w = Math.max(8, Math.round((Math.abs(it.value) / maxVal) * 62)); // % of track
    return el("div", { style: { display: "flex", alignItems: "center", gap: 18, marginTop: i === 0 ? 6 : 22 } }, [
      el("div", { style: { display: "flex", width: 240, fontFamily: "B", fontSize: 27, color: INK, justifyContent: "flex-end" } }, it.label),
      el("div", { style: { display: "flex", flexGrow: 1, alignItems: "center", gap: 14 } }, [
        el("div", { style: { display: "flex", width: `${w}%`, height: 40, backgroundColor: i === 0 ? BLUE : "#7EB0FB", borderRadius: 9 } }),
        el("div", { style: { display: "flex", fontFamily: "T", fontSize: 27, color: i === 0 ? BLUE : SUB } }, it.valueText),
      ]),
    ]);
  });
  return toPng(frame(opts.title, opts.brand, rows));
}
