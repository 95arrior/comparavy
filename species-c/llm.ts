// [species-c] Anthropic 호출 래퍼 — 자체 구현(기존 lib/* import 금지).
import Anthropic from "@anthropic-ai/sdk";
import { loadEnv } from "./env";
import { LLM } from "./config";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  loadEnv();
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY 미설정 (.env.local)");
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export async function ask(prompt: string, maxTokens: number, system?: string): Promise<string> {
  const res = await getClient().messages.create({
    model: LLM.model,
    max_tokens: maxTokens,
    thinking: { type: "adaptive" },
    ...(system ? { system } : {}),
    messages: [{ role: "user", content: prompt }],
  });
  return res.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n");
}

/** JSON 강제 — 첫 {..} 또는 [..] 블록을 파싱. 실패 시 1회 재시도. */
export async function askJson<T>(prompt: string, maxTokens: number, system?: string): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await ask(prompt + "\n\n출력 계약: 설명 없이 JSON만 출력한다.", maxTokens, system);
    const m = text.match(/[\[{][\s\S]*[\]}]/);
    if (m) {
      try { return JSON.parse(m[0]) as T; } catch { /* 재시도 */ }
    }
  }
  throw new Error("LLM JSON 파싱 2회 실패");
}
