// Gemini 이미지 생성(REST) — 서버 전용. GEMINI_API_KEY 없으면 ready=false.
// ★2트랙 원칙: 무자막 일러스트 비주얼만(이미지 속 텍스트 금지 — 한글 렌더 불안정 + 정보는 본문 텍스트가 담당),
//   실사(사진) 위장 금지 — 경험 조작으로 보이면 계정 리스크.

const MODEL = "gemini-2.5-flash-image";

export function imageReady(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

const BASE_STYLE = [
  "STRICTLY NO text, NO letters, NO numbers, NO watermarks anywhere in the image.",
  "NOT photorealistic — clearly an illustration.",
].join(" ");

// ★다양성 변주 — 1만 명이 같은 글감이어도 같은 그림이 안 나오게.
//  계정 시드(항상 같은 축) + 요청 난수(매번 다른 축) 조합으로 스타일·팔레트·구도·분위기를 배정.
const ART_STYLES = [
  "premium editorial flat illustration with refined shapes and subtle grain texture",
  "sophisticated isometric illustration with gentle depth and soft shadows",
  "elegant gouache-textured illustration with rich layered colors",
  "modern gradient-mesh illustration with smooth dimensional forms",
  "detailed line-and-fill illustration with delicate linework and warm fills",
];
const PALETTES = [
  "warm friendly palette of coral, cream and sky blue",
  "cool calm palette of navy, mint and off-white",
  "pastel palette of lavender, peach and pale yellow",
  "earthy palette of sage green, terracotta and sand",
  "vivid palette of cobalt blue, tangerine and white",
];
const COMPOSITIONS = [
  "subject centered with generous negative space",
  "subject placed on the left third, airy background on the right",
  "slight top-down diagonal composition",
  "close-up framing on the key object",
  "wide scene with small human figure for scale",
];
const MOODS = ["calm and tidy", "bright and optimistic", "cozy and warm", "fresh and energetic", "quiet and focused"];

function fnv(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

/** 사진 자리 설명(한국어) + 글 제목 → 무자막 일러스트 1장(base64). userSeed로 계정별 화풍 고정 + 요청마다 변주. 실패 시 throw. */
export async function generateBlogImage(slotDesc: string, articleTitle: string, userSeed?: string): Promise<{ base64: string; mime: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("NOT_READY");
  const uh = fnv(userSeed ?? "anon");
  const nonce = Math.floor(Math.random() * 1e9);
  // 화풍·팔레트 = 계정 고정(블로그 안 이미지 톤 일관) / 구도·분위기 = 요청마다 변주(같은 글감도 다른 그림)
  const art = ART_STYLES[uh % ART_STYLES.length];
  const palette = PALETTES[(uh >> 3) % PALETTES.length];
  const compo = COMPOSITIONS[nonce % COMPOSITIONS.length];
  const mood = MOODS[(nonce >> 4) % MOODS.length];
  const STYLE = `${art}, ${palette}, ${compo}, ${mood} mood, modern Korean lifestyle blog aesthetic. Masterful composition, harmonious lighting, crisp refined details, high-end magazine quality. ${BASE_STYLE}`;
  const prompt = `Blog illustration for a Korean blog post titled "${articleTitle}". Scene: ${slotDesc}. ${STYLE}`;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message ?? `Gemini ${res.status}`;
    // 잔액 소진/쿼터 — 관리자가 즉시 알아야 하는 신호
    const quota = res.status === 429 || /quota|billing|exhausted/i.test(msg);
    throw new Error(quota ? "QUOTA" : msg);
  }
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) {
    if (p.inlineData?.data) return { base64: p.inlineData.data, mime: p.inlineData.mimeType ?? "image/png" };
  }
  throw new Error("이미지가 생성되지 않았어요.");
}

export const GEMINI_IMAGE_MODEL = MODEL;
