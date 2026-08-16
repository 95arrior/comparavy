// ★외부 생성용 이미지 프롬프트 빌더(2026-08-17 유저: "이미지는 완벽한 프롬프트로 대체" — 키 죽은 동안
//  유저가 외부 도구에서 생성해 '내 사진'으로 넣는 흐름. 규격은 설계서② 확정분).
//  ★썸네일과 본문은 목적이 달라 프롬프트를 분리한다: 썸네일=멈추게, 본문=이해·리듬.

const THUMB_STYLES = [
  "person reacting — a single person's upper body showing a clear emotion (checking a bankbook with a frozen face, looking at a phone bill with wide eyes)",
  "object close-up — one everyday money object filling the frame (a card statement and wallet on a kitchen table, coins next to a passbook)",
  "situation — a real-life money moment (paying at a convenience store counter, opening a delivery app at night)",
  "comparison — two things side by side telling the story (a big shopping basket vs a small thin wallet)",
  "symbolic — one simple visual metaphor (money slipping out of a pay envelope, a shrinking coin stack)",
] as const;

// ★주제 팔레트가 증감 팔레트보다 먼저(2026-08-17 실측: '국민연금 인상'이 '인상'에 걸려 주황 — 연금 네이비가 못 이겼다)
const CAT_PALETTE: [RegExp, string][] = [
  [/(부동산|아파트|전세|월세|청약|주거)/, "beige and warm brown tones (housing)"],
  [/(주식|증시|코스피|투자)/, "charcoal with one neon accent (markets)"],
  [/(세금|납부|국세|주민세)/, "clean white with a red point color (tax)"],
  [/(정책|정부|연금|국민연금)/, "navy and cream tones (policy)"],
  [/(소비|생활비|물가|배달|장보기)/, "yellow and coral tones (daily spending)"],
  [/(지원|환급|입금|이득|적금|저축)/, "fresh green and ivory tones (money coming in)"],
  [/(인상|부담|손해|대출|이자|빠져|카드)/, "warm orange with a red accent (money going out)"],
];

function hashPick<T>(arr: readonly T[], seed: string): T {
  const h = Math.abs([...seed].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  return arr[h % arr.length];
}

function paletteFor(text: string): string {
  for (const [re, p] of CAT_PALETTE) if (re.test(text)) return p;
  return "soft pastel tones with one warm accent";
}

/** 썸네일용 — 멈추게 하는 한 장면(1200², 중앙 70%, 요소 최소, 무텍스트). scene을 주면 그 장면을, 없으면 스타일 로테이션. */
export function buildThumbImagePrompt(keyword: string, scene?: string | null): string {
  const style = hashPick(THUMB_STYLES, keyword);
  const palette = paletteFor(keyword);
  return [
    `Flat vector illustration for a Korean finance blog thumbnail about "${keyword}".`,
    `Scene: ${scene?.trim() || style}.`,
    "Show the scene caused by the money event — a person or object experiencing it — never charts, graphs, office buildings or cash piles.",
    "Composition: 1200x1200 square, the main subject centered within the middle 70% (edges may be cropped by feeds), one strong foreground subject, very simple background, at most 2 supporting props.",
    "Emotion must read instantly even at small mobile size.",
    `Color: ${palette}, clean Toss-style flat illustration, soft shapes, generous negative space in the lower third for a short Korean caption to be overlaid later.`,
    "Absolutely no text, no letters, no numbers, no logos anywhere in the image.",
  ].join(" ");
}

/** 본문용 — 이해·스크롤 리듬을 위한 자연스러운 장면(과장 금지, 여백, 무텍스트). */
export function buildBodyImagePrompt(sceneDesc: string, keyword: string): string {
  const palette = paletteFor(`${keyword} ${sceneDesc}`);
  return [
    `Flat vector illustration for the body of a Korean finance blog post.`,
    `Scene: ${sceneDesc.trim()}.`,
    "Natural, calm everyday scene that helps the reader picture the situation — no exaggerated shock faces, no clickbait energy, no charts or graphs.",
    "Composition: wide 4:3, subject slightly off-center, plenty of breathing room, simple background.",
    `Color: ${palette}, clean Toss-style flat illustration, soft shapes.`,
    "Absolutely no text, no letters, no numbers, no logos anywhere in the image.",
  ].join(" ");
}
