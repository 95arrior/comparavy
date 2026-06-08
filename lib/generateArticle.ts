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
  /** 글쓴이에게 보여줄 짧은 메모: 검색 의도를 어떻게 보고 왜 이렇게 구성했는지 (본문 아님) */
  write_note: string;
}

const SAVE_TOOL: Anthropic.Tool = {
  name: "save_article",
  description: "생성한 한국어 SEO 블로그 글을 구조화된 형태로 저장한다.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "글 제목(H1). 핵심 키워드를 앞쪽에 자연스럽게, 검색 의도에 맞게" },
      meta_title: { type: "string", description: "검색결과 노출용 제목. 핵심 키워드를 앞에, 한국어 30자 내외(검색결과에서 잘리지 않게)" },
      meta_description: {
        type: "string",
        description: "검색결과 설명문(스니펫). 키워드 포함 + 클릭 유도, 한국어 75자 내외",
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
      write_note: {
        type: "string",
        description:
          "글쓴이(블로그 운영자)에게 보여줄 짧은 메모 1~2문장. 이 키워드의 검색 의도를 어떻게 파악했고, 왜 이런 소제목·순서·구성으로 썼는지 담백하게 설명한다. 자기소개·인사·메타 표현 없이. 본문에는 절대 포함하지 않는다.",
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
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

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
    write_note: clamp(raw.write_note ?? "", 400),
  };
}

/**
 * 누적된 부분 JSON에서 body_html 값을 현재까지 만큼 추출한다(스트리밍 표시용).
 * 닫는 따옴표가 아직 안 왔으면 지금까지 들어온 부분을 반환. JSON 이스케이프 처리.
 */
function extractJsonString(acc: string, key: string): string | null {
  const ki = acc.indexOf(`"${key}"`);
  if (ki === -1) return null;
  const colon = acc.indexOf(":", ki + key.length + 2);
  if (colon === -1) return null;
  let i = colon + 1;
  while (i < acc.length && acc[i] !== '"') i++;
  if (i >= acc.length) return null;
  let out = "";
  let j = i + 1;
  while (j < acc.length) {
    const c = acc[j];
    if (c === "\\") {
      const next = acc[j + 1];
      if (next === undefined) break; // 이스케이프가 잘림 → 여기까지
      if (next === "u") {
        const hex = acc.slice(j + 2, j + 6);
        if (hex.length < 4) break;
        out += String.fromCharCode(parseInt(hex, 16));
        j += 6;
      } else {
        const map: Record<string, string> = { n: "\n", t: "\t", r: "\r", '"': '"', "\\": "\\", "/": "/" };
        out += map[next] ?? next;
        j += 2;
      }
    } else if (c === '"') {
      break; // 닫는 따옴표
    } else {
      out += c;
      j++;
    }
  }
  return out;
}

/**
 * generateArticle 와 동일한 생성을 스트리밍으로 수행한다(같은 프롬프트·모델·tool
 * = 품질 동일). 본문이 들어오는 대로 onBody(현재까지 body_html)를 호출하고,
 * 완료 시 최종 GeneratedArticle 를 반환한다.
 */
export async function streamArticle(
  input: ArticlePromptInput,
  onBody: (bodyHtmlSoFar: string) => void,
  onTitle?: (titleSoFar: string) => void,
): Promise<GeneratedArticle> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 가 설정되지 않았습니다.");

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  const maxTokens = Math.min(16000, Math.ceil(input.maxWords * 2 + 1200));

  const stream = client.messages.stream({
    model,
    max_tokens: maxTokens,
    system: buildSystemPrompt(),
    tools: [SAVE_TOOL],
    tool_choice: { type: "tool", name: "save_article" },
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });

  let acc = "";
  let lastBody = "";
  let lastTitle = "";
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "input_json_delta"
    ) {
      acc += event.delta.partial_json;
      // 제목이 본문보다 먼저 스트리밍됨 → 미리보기 맨 위 H1으로 먼저 띄운다
      if (onTitle) {
        const t = extractJsonString(acc, "title");
        if (t !== null && t !== lastTitle) {
          lastTitle = t;
          onTitle(t);
        }
      }
      const body = extractJsonString(acc, "body_html");
      if (body !== null && body !== lastBody) {
        lastBody = body;
        onBody(body);
      }
    }
  }

  const final = await stream.finalMessage();
  const block = final.content.find((b) => b.type === "tool_use");
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
    write_note: clamp(raw.write_note ?? "", 400),
  };
}
