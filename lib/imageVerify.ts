import Anthropic from "@anthropic-ai/sdk";
import { logUsage } from "./usageLog";

// ★생성 후 비전 검증 1회(Haiku) — 텍스트 포함/얼굴/장면 일치. 대표 배경은 텍스트만 검사.
//  실패 시 호출측이 재생성 1회 → 재실패 시 컷 드롭(본문) / 코드 폴백(배경).
export interface ImageVerdict { hasText: boolean; hasFace: boolean; matchesScene: boolean; ok: boolean }

export async function verifyImage(
  base64: string, mime: string, sceneDesc: string, opts?: { bgOnly?: boolean; userId?: string },
): Promise<ImageVerdict> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  // 키 없으면 통과 처리(검증은 부가 안전망 — 없다고 발행 막지 않음)
  if (!apiKey) return { hasText: false, hasFace: false, matchesScene: true, ok: true };
  try {
    const client = new Anthropic({ apiKey });
    const q = opts?.bgOnly
      ? `이 이미지에 글자·문자·숫자·로고·워터마크가 조금이라도 보이는가? JSON만: {"hasText":bool}`
      : `이 이미지를 점검한다. (1)글자·문자·숫자·로고·워터마크가 보이는가 (2)사람 얼굴(이목구비)이 보이는가 (3)"${sceneDesc}" 장면과 대체로 맞는가. JSON만: {"hasText":bool,"hasFace":bool,"matchesScene":bool}`;
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 120,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: (mime || "image/png") as "image/png", data: base64 } },
        { type: "text", text: q },
      ] }],
    });
    void logUsage({ userId: opts?.userId, model: "claude-haiku-4-5", kind: "image_verify", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
    const t = res.content[0]?.type === "text" ? res.content[0].text : "";
    const j = JSON.parse((/\{[\s\S]*\}/.exec(t) ?? ["{}"])[0]);
    const hasText = !!j.hasText, hasFace = !!j.hasFace;
    const matchesScene = opts?.bgOnly ? true : (j.matchesScene !== false);
    return { hasText, hasFace, matchesScene, ok: !hasText && !hasFace && matchesScene };
  } catch {
    return { hasText: false, hasFace: false, matchesScene: true, ok: true }; // 검증 실패는 발행 막지 않음
  }
}
