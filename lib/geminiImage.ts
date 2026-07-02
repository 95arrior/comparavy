// Gemini 이미지 생성(REST) — 서버 전용. GEMINI_API_KEY 없으면 ready=false.
// ★2트랙 원칙: 무자막 일러스트 비주얼만(이미지 속 텍스트 금지 — 한글 렌더 불안정 + 정보는 본문 텍스트가 담당),
//   실사(사진) 위장 금지 — 경험 조작으로 보이면 계정 리스크.

const MODEL = "gemini-2.5-flash-image";

export function imageReady(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

const STYLE = [
  "Clean flat vector illustration, soft rounded shapes, warm friendly palette,",
  "modern Korean lifestyle blog aesthetic, generous white space, subtle gradients.",
  "STRICTLY NO text, NO letters, NO numbers, NO watermarks anywhere in the image.",
  "NOT photorealistic — clearly an illustration.",
].join(" ");

/** 사진 자리 설명(한국어) + 글 제목 → 무자막 일러스트 1장(base64). 실패 시 throw. */
export async function generateBlogImage(slotDesc: string, articleTitle: string): Promise<{ base64: string; mime: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("NOT_READY");
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
