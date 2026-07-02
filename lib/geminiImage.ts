// Gemini 이미지 생성(REST) — 서버 전용. GEMINI_API_KEY 없으면 ready=false.
// ★2트랙 원칙: 무자막 일러스트 비주얼만(이미지 속 텍스트 금지 — 한글 렌더 불안정 + 정보는 본문 텍스트가 담당),
//   실사(사진) 위장 금지 — 경험 조작으로 보이면 계정 리스크.

const MODEL = "gemini-2.5-flash-image";

export function imageReady(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

const BASE_STYLE = [
  "ABSOLUTELY NO text of any kind: no letters, no numbers, no Korean characters (Hangul), no signs, no labels, no captions, no watermarks, no UI text.",
  "Any screen, sign, book, paper or package in the scene must be completely blank or filled with abstract shapes only.",
  "Do NOT render any words from this prompt into the image.",
  "NOT photorealistic — clearly an illustration.",
].join(" ");

// ★다양성 변주 — 1만 명이 같은 글감이어도 같은 그림이 안 나오게.
//  계정 시드(항상 같은 축) + 요청 난수(매번 다른 축) 조합으로 스타일·팔레트·구도·분위기를 배정.
const ART_STYLES = [
  "premium soft 3D clay render with smooth rounded forms and studio lighting",
  "dramatic cinematic 3D render with depth of field and volumetric light",
  "bold pop-art illustration with thick outlines and halftone texture",
  "surreal editorial illustration with playful oversized objects and tiny people",
  "high-end flat illustration with rich grain texture and layered depth",
  "vibrant gradient-glass illustration with translucent dimensional forms",
  "retro-modern collage illustration with paper textures and bold shapes",
  "isometric 3D diorama with miniature world charm and glossy accents",
  "painterly gouache illustration with rich color depth and visible brushwork",
  "neon-accent dark illustration with glowing highlights on deep background",
];
const PALETTES = [
  "warm coral, cream and sky blue",
  "deep navy, mint and off-white",
  "pastel lavender, peach and pale yellow",
  "earthy sage green, terracotta and sand",
  "vivid cobalt blue, tangerine and white",
  "bold crimson, charcoal and warm gray",
  "electric purple, hot pink and midnight blue",
  "sunshine yellow, forest green and cream",
];
const COMPOSITIONS = [
  "subject centered with generous negative space",
  "subject on the left third, airy background on the right",
  "dramatic low-angle view emphasizing scale",
  "extreme close-up on the key object with shallow depth",
  "wide scene with a small human figure for scale contrast",
  "diagonal dynamic composition with strong movement",
];
const MOODS = ["calm and tidy", "bright and optimistic", "cozy and warm", "fresh and energetic", "dramatic and striking", "playful and eye-catching", "luxurious and refined"];

function fnv(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

/** 사진 자리 설명(한국어) + 글 제목 → 무자막 일러스트 1장(base64). userSeed로 계정별 화풍 고정 + 요청마다 변주. 실패 시 throw. */
export async function generateBlogImage(slotDesc: string, articleTitle: string, userSeed?: string, opts?: { thumbnail?: boolean }): Promise<{ base64: string; mime: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("NOT_READY");
  void fnv; void userSeed;
  // ★전부 요청마다 랜덤 — '계정 고정 화풍'은 같은 계정이 여러 글을 쓰면 전부 같은 풍이 되는 역효과(유저 피드백).
  //  장마다 화풍·팔레트·구도·분위기가 달라져 만 명이 써도, 한 명이 백 장을 만들어도 겹치지 않는다.
  const nonce = Math.floor(Math.random() * 1e9);
  const art = ART_STYLES[nonce % ART_STYLES.length];
  const palette = PALETTES[(nonce >> 3) % PALETTES.length];
  const compo = COMPOSITIONS[(nonce >> 7) % COMPOSITIONS.length];
  const mood = MOODS[(nonce >> 11) % MOODS.length];
  const STYLE = `${art}, ${palette}, ${compo}, ${mood} mood, modern Korean lifestyle blog aesthetic. Wide horizontal 16:9 banner composition. Masterful composition, cinematic lighting, crisp refined details, rich color depth, award-winning high-end magazine quality. ${BASE_STYLE}`;
  // ★1번(대표) 이미지 = 검색 결과의 3초 훅 — 작게 봐도 읽히는 한 방이 없으면 클릭 자체가 없다
  const HOOK = opts?.thumbnail
    ? "This is the article's REPRESENTATIVE THUMBNAIL competing for clicks in crowded search results: ONE bold oversized focal subject bursting toward the viewer, exaggerated dramatic scale, intense color contrast that pops against competitors, strong silhouette readable at 100px, a slightly provocative curiosity-gap composition that makes people NEED to tap — attention-grabbing but never misleading. "
    : "";
  // 주제 연관성: 제목은 '무엇에 관한 글인지' 맥락으로만 제공(글자로 그리지 말라고 명시), 장면 설명을 충실히 시각화
  const prompt = `Editorial illustration for a Korean lifestyle blog post. Topic context (for understanding ONLY — never render these words as text): ${articleTitle}. ${HOOK}Faithfully depict this specific scene with clearly recognizable subjects: ${slotDesc}. ${STYLE}`;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { imageConfig: { aspectRatio: "16:9" } } }),
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
