import Anthropic from "@anthropic-ai/sdk";
import {
  buildSystemPrompt,
  buildUserPrompt,
  type ArticlePromptInput,
} from "./articlePrompt";

export interface FaqItem {
  question: string;
  answer: string;
}

export interface GeneratedArticle {
  title: string;
  meta_title: string;
  meta_description: string;
  body_html: string;
  faq: FaqItem[];
}

const SAVE_TOOL: Anthropic.Tool = {
  name: "save_article",
  description: "생성한 한국어 SEO 블로그 글을 구조화된 형태로 저장한다.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "글 제목 (한국어, 매력적이고 검색 의도에 맞게)" },
      meta_title: { type: "string", description: "SEO 메타 제목 (한국어, 60자 이하)" },
      meta_description: {
        type: "string",
        description: "SEO 메타 설명 (한국어, 160자 이하)",
      },
      body_html: {
        type: "string",
        description: "본문 HTML. <h2>,<h3>,<p>,<ul>,<li>만 사용하고 인라인 스타일 금지.",
      },
      faq: {
        type: "array",
        description: "자주 묻는 질문 3~5개 (한국어)",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            answer: { type: "string" },
          },
          required: ["question", "answer"],
        },
      },
    },
    required: ["title", "meta_title", "meta_description", "body_html", "faq"],
  },
};

function clamp(text: string, max: number): string {
  const trimmed = (text ?? "").trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max);
}

/** Anthropic 모델로 한국어 SEO 글 1편을 생성한다. */
export async function generateArticle(
  input: ArticlePromptInput,
): Promise<GeneratedArticle> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 가 설정되지 않았습니다.");

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

  // 한국어는 글자수 기준. 한글 1자 ≈ 1.5~2토큰으로 보고 여유 있게 budget 산정.
  const maxTokens = Math.min(16000, Math.ceil(input.maxWords * 2 + 1200));

  const res = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: buildSystemPrompt(),
    tools: [SAVE_TOOL],
    tool_choice: { type: "tool", name: "save_article" },
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });

  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("글 생성에 실패했습니다. 다시 시도해 주세요.");
  }

  const raw = block.input as Partial<GeneratedArticle>;

  return {
    title: (raw.title ?? "").trim(),
    meta_title: clamp(raw.meta_title ?? raw.title ?? "", 60),
    meta_description: clamp(raw.meta_description ?? "", 160),
    body_html: (raw.body_html ?? "").trim(),
    faq: Array.isArray(raw.faq) ? raw.faq : [],
  };
}
