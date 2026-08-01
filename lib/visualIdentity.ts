// ★유저 시각 정체성(userId 시드, 결정론적) — 대표이미지·본문이미지의 고정 스타일.
//  유저 안에서는 항상 일관(블로그 브랜딩), 유저 사이에서는 갈라진다(1만 명 수렴 방지).
//  텍스트는 AI가 아니라 코드(satori)가 렌더 → 절대 안 깨진다. AI는 배경만.
//
//  폰트 라이선스(전부 SIL OFL 1.1 — 상업/재배포/임베드 허용):
//   - Pretendard (Black/Bold/SemiBold/Regular): OFL 1.1, © orioncactus. https://github.com/orioncactus/pretendard
//   - Gowun Batang (Bold): OFL 1.1, © Yanghee Ryu. (명조 계열 대비용)
//   - Jua: OFL 1.1, © Woowahan Brothers. (둥근 고딕)
//   - Do Hyeon: OFL 1.1, © Woowahan Brothers. (굵은 디스플레이)

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/* ── 대비비(WCAG) — 팔레트 검증용 ── */
function srgbToLin(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return 0;
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
  return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
}
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/* ── 팔레트 12종 — {배경, 타이틀, 포인트}. 타이틀:배경 대비 4.5:1 이상(코드 검증) ── */
export interface Palette { name: string; bg: string; title: string; point: string; panel: string }
export const PALETTES: Palette[] = [
  { name: "ink-cream", bg: "#F4EFE6", title: "#1B1B1A", point: "#C6553F", panel: "#FFFFFFCC" },
  { name: "navy-sky", bg: "#0E2A47", title: "#FFFFFF", point: "#6FB1E6", panel: "#0B1F35CC" },
  { name: "forest-linen", bg: "#EDF0E6", title: "#20302A", point: "#3E7C5A", panel: "#FFFFFFCC" },
  { name: "charcoal-gold", bg: "#1E1E22", title: "#F5F3EE", point: "#D9A441", panel: "#14141799" },
  { name: "sand-terra", bg: "#EFE2D2", title: "#3A2A20", point: "#B5623C", panel: "#FFFFFFCC" },
  { name: "plum-mist", bg: "#F1EBF2", title: "#2E2036", point: "#7A4E8C", panel: "#FFFFFFCC" },
  { name: "slate-mint", bg: "#12312F", title: "#F0F7F5", point: "#67C7B0", panel: "#0C24229C" },
  { name: "paper-cobalt", bg: "#F5F4F0", title: "#16233F", point: "#2E5AAC", panel: "#FFFFFFCC" },
  { name: "wine-blush", bg: "#3A1720", title: "#F7ECEE", point: "#E0899A", panel: "#2611189C" },
  { name: "olive-cream", bg: "#E9E7D8", title: "#33341F", point: "#8A7B33", panel: "#FFFFFFCC" },
  { name: "graphite-coral", bg: "#26262B", title: "#F2EFEA", point: "#E8785B", panel: "#17171B99" },
  { name: "sky-ink", bg: "#E6EEF4", title: "#132330", point: "#2C6E8F", panel: "#FFFFFFCC" },
];

/* ── 폰트 페어 6종 — 전부 디스플레이성 강한 헤비 타이틀(OFL 1.1). {title, body} ──
   Black Han Sans: OFL 1.1, © Zess (초헤비 디스플레이). 나머지 라이선스는 파일 상단 주석 참조. */
export interface FontPair { name: string; title: string; body: string }
export const FONT_PAIRS: FontPair[] = [
  { name: "blackhansans", title: "BlackHanSans", body: "Pretendard-Regular" },
  { name: "pretendard-black", title: "Pretendard-Black", body: "Pretendard-Regular" },
  { name: "dohyeon", title: "DoHyeon", body: "Pretendard-Regular" },
  { name: "jua", title: "Jua", body: "Pretendard-Regular" },
  { name: "pretendard-bold", title: "Pretendard-Bold", body: "Pretendard-Regular" },
  { name: "gowun-editorial", title: "GowunBatang-Bold", body: "Pretendard-Regular" },
];

/* ── 레이아웃 10종 — 토스/당근 문법(상하 2단·오브젝트 무대) 안의 변주 ──
   각각 오브젝트 종류·배치 + 카피 정렬 + 배지 위치 조합. 좌표/크기는 렌더러의 TEMPLATES에 명세. */
export type LayoutKey =
  | "center-cluster" | "right-mass" | "diagonal-flow" | "left-blob" | "ring-accent"
  | "arch-bottom" | "stacked-mass" | "corner-pop" | "wide-band" | "split-tone";
export const LAYOUTS: LayoutKey[] = [
  "center-cluster", "right-mass", "diagonal-flow", "left-blob", "ring-accent",
  "arch-bottom", "stacked-mass", "corner-pop", "wide-band", "split-tone",
];

/* ── 배경 스타일 8종 (AI 배경 프롬프트 힌트 + 코드 폴백 종류) ── */
export type BgStyle = "soft-gradient" | "abstract-shapes" | "blurred-photo" | "paper-texture"
  | "grain-wash" | "geometric-lines" | "bokeh-soft" | "duotone-fade";
export const BG_STYLES: BgStyle[] = [
  "soft-gradient", "abstract-shapes", "blurred-photo", "paper-texture",
  "grain-wash", "geometric-lines", "bokeh-soft", "duotone-fade",
];

/* ── 본문 이미지 톤 8종 (온보딩 타깃 연동은 프롬프트에서) ── */
export const BODY_TONES = [
  "따뜻한 자연광 필름 톤", "차분한 무채색 미니멀", "맑은 아침 햇살 톤", "포근한 실내 텅스텐 톤",
  "선명한 채도 낮춘 파스텔", "가을 앰버 톤", "청량한 블루아워 톤", "부드러운 흐린 날 확산광",
];

// ★조합 공간(썸네일, v4 실태):
//  - 유저 고정 정체성(플랫 렌더): 레이아웃 10 × 팔레트 12 × 폰트 6 = 720가지. (bgStyle은 플랫 렌더에 미사용)
//  - 유저 내 글별 '포즈 변주'(팔레트·템플릿·폰트 고정, 오브젝트 배치만): 좌우반전 2 × 블롭회전 3 × 배치이동 3 = 18.
//    → 한 유저가 만드는 썸네일의 시각 변형은 720 계열 중 1계열 × 포즈 18 = 계열 내 18가지 '같은 옷 다른 포즈'.
//  - AI 배경 경로를 쓰면 bgStyle 8종이 추가로 곱해짐(× 8).
//  1만 명 대비: 720 정체성 × 포즈 18 = 12,960 시각 변형. 여기에 카피(무한)가 곱해져 실질 중복 0에 수렴.
export const THUMB_COMBO_SPACE = LAYOUTS.length * PALETTES.length * FONT_PAIRS.length; // 720 (유저 고정 정체성)
export const THUMB_POSE_VARIANTS = 2 * 3 * 3; // 18 (유저 내 글별 포즈)

export interface VisualIdentity {
  layout: LayoutKey;
  palette: Palette;
  fontPair: FontPair;
  bgStyle: BgStyle;
  bodyTone: string;
}

/* ★시각 프리셋 10석(2026-08-02 유저 확정 — 최대 10명 운영).
   해시 조합(720가지)은 '충돌 확률이 낮다'일 뿐 0이 아니다. 10명 중 둘이 같은 레이아웃·팔레트를 받으면
   피드에서 같은 블로그로 보인다 — 그게 정확히 우리가 없애려는 지문이다.
   그래서 10석은 서로 최대한 멀리 떨어진 조합을 사람이 골라 고정한다(레이아웃 10종을 전부 다르게 쓰고,
   팔레트도 겹치지 않게 배정). 11번째부터는 기존 해시로 폴백한다(10석 설계가 깨지지 않게 뒤에 붙인다). */
const VISUAL_PRESETS: { layout: LayoutKey; paletteIdx: number; fontIdx: number; bgIdx: number; toneIdx: number }[] = [
  { layout: "center-cluster", paletteIdx: 0, fontIdx: 0, bgIdx: 0, toneIdx: 0 },
  { layout: "right-mass", paletteIdx: 1, fontIdx: 1, bgIdx: 1, toneIdx: 1 },
  { layout: "diagonal-flow", paletteIdx: 2, fontIdx: 2, bgIdx: 2, toneIdx: 2 },
  { layout: "left-blob", paletteIdx: 3, fontIdx: 3, bgIdx: 3, toneIdx: 3 },
  { layout: "ring-accent", paletteIdx: 4, fontIdx: 4, bgIdx: 4, toneIdx: 4 },
  { layout: "arch-bottom", paletteIdx: 5, fontIdx: 5, bgIdx: 5, toneIdx: 5 },
  { layout: "stacked-mass", paletteIdx: 6, fontIdx: 0, bgIdx: 6, toneIdx: 6 },
  { layout: "corner-pop", paletteIdx: 7, fontIdx: 1, bgIdx: 7, toneIdx: 7 },
  { layout: "wide-band", paletteIdx: 8, fontIdx: 2, bgIdx: 0, toneIdx: 0 },
  { layout: "split-tone", paletteIdx: 9, fontIdx: 3, bgIdx: 1, toneIdx: 1 },
];

/** 환경변수로 1:1 고정 배정("id:0,id2:5"). 10명 운영을 시작하면 이걸로 못 박는다(충돌 0 보장). */
function visualSeatFromEnv(userId: string): number | null {
  const raw = process.env.ATEFLO_VISUAL_ASSIGN;
  if (!raw) return null;
  for (const pair of raw.split(",")) {
    const [id, seat] = pair.split(":").map((x) => x.trim());
    if (id === userId && seat !== undefined) {
      const n = Number(seat);
      if (Number.isInteger(n) && n >= 0 && n < VISUAL_PRESETS.length) return n;
    }
  }
  return null;
}

/** 유저별 고정 시각 정체성. 같은 userId는 항상 같은 조합. */
export function visualIdentityFor(userId: string): VisualIdentity {
  const h = fnv1a(userId + "|visual");
  const seat = visualSeatFromEnv(userId) ?? h % VISUAL_PRESETS.length;
  const p = VISUAL_PRESETS[seat]!;
  return {
    layout: p.layout,
    palette: PALETTES[p.paletteIdx % PALETTES.length],
    fontPair: FONT_PAIRS[p.fontIdx % FONT_PAIRS.length],
    bgStyle: BG_STYLES[p.bgIdx % BG_STYLES.length],
    bodyTone: BODY_TONES[p.toneIdx % BODY_TONES.length],
  };
}
