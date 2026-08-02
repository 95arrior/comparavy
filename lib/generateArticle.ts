import Anthropic from "@anthropic-ai/sdk";
import { scanFacts, applyFactFix, type FactIssue } from "@/lib/factGate";
import { isTimeSensitive } from "./timeSensitive";
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
  /** 워드프레스 태그 3~5개 (한국어 검색어/연관어) */
  tags: string[];
  /** 글쓴이에게 보여줄 짧은 메모: 검색 의도를 어떻게 보고 왜 이렇게 구성했는지 (본문 아님) */
  write_note: string;
  /** 발행 전 사실 검사 결과(lib/factGate) — 빈 배열이면 통과. 차단이 아니라 '무엇을 어떻게 고칠지'를 들고 다닌다. */
  fact_issues: FactIssue[];
}

/**
 * 툴 결과를 GeneratedArticle로 확정한다. ★두 생성 경로(단발·스트리밍)가 반드시 이 함수를 지난다 —
 *  팩트 검사를 호출부(생성·재작성·자동발행 3곳)에 복붙하면 반드시 빠지는 경로가 생긴다(게이트 중앙화 원칙).
 *  FAQ 답변까지 함께 검사한다 — 본문은 맞는데 FAQ에서 옛 숫자가 되살아나는 게 흔하다.
 */
function finalize(raw: Partial<GeneratedArticle>, keyword: string): GeneratedArticle {
  const title = (raw.title ?? "").trim();
  let body_html = (raw.body_html ?? "").trim();
  const faq = Array.isArray(raw.faq) ? raw.faq : [];
  const faqText = faq.map((f) => `${f?.question ?? ""} ${f?.answer ?? ""}`).join("\n");

  // ★고칠 수 있는 건 여기서 고쳐서 내보낸다(2026-08-02 유저: "검사할 거 있음 너가 수정해서 뽑으라니깐").
  //  종전엔 옛 한도·옛 요율처럼 '값만 바꾸면 문장이 그대로 성립하는' 오류까지 검토 화면 안내로 넘겼다.
  //  그건 검사가 아니라 숙제 떠넘기기다 — 치환 규칙(replace)이 붙은 오류는 사람 손이 필요 없다.
  //  ★모델을 다시 부르지 않는다(비용 0, 결정적). 재생성이 필요한 건 서술 방식 문제뿐이다.
  //  같은 오류가 치환 뒤에도 남으면 무한 반복이 되므로, 한 번 돌고 줄어들 때만 계속한다.
  for (let pass = 0; pass < 3; pass++) {
    const fixable = scanFacts(`${title}\n${body_html}\n${faqText}`, keyword).filter((i) => i.replace);
    if (!fixable.length) break;
    const before = body_html;
    for (const issue of fixable) body_html = applyFactFix(body_html, issue);
    if (body_html === before) break; // 치환이 본문에 안 닿았다(FAQ 쪽 오류 등) — 검토 화면이 맡는다
  }

  return {
    title,
    meta_title: clamp(raw.meta_title ?? raw.title ?? "", 60),
    meta_description: clamp(raw.meta_description ?? "", 160),
    body_html,
    faq,
    tags: cleanTags(raw.tags),
    write_note: clamp(raw.write_note ?? "", 400),
    fact_issues: scanFacts(`${title}\n${body_html}\n${faqText}`, keyword),
  };
}

const SAVE_TOOL: Anthropic.Tool = {
  name: "save_article",
  description: "생성한 한국어 SEO 블로그 글을 구조화된 형태로 저장한다. 필드는 스키마 순서대로 채운다(title 다음 body_html — 스트리밍 체감).",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "글 제목(H1). 핵심 키워드를 앞쪽에 자연스럽게, 검색 의도에 맞게" },
      body_html: {
        type: "string",
        description:
          "본문 HTML. 허용 태그: <h2>,<h3>,<p>,<ul>,<li>,<strong>,<mark>,<blockquote>. 인라인 스타일 금지. " +
          "★각 소제목(h2) 바로 아래에 그 질문의 '핵심 답'을 2~3문장 먼저(자기완결·그 부분만 떼어도 인용 가능) 후 근거로 풀어쓴다. " +
          "★가독성: ①각 소제목 아래 '핵심 답'을 먼저 ②★한 문단은 짧게(1~3문장, 벽돌 금지) ③나열·비교·단계·조건은 줄글 말고 <ul>로 한눈에 ④마지막에 '핵심 요약'을 <ul>로 ⑤[사진:]을 소제목 직후 등 곳곳에 넣어 텍스트 벽을 깸. ★네이버 블로그 규격이므로 '형광펜(<mark>)'과 '핵심 요약 인용박스(<blockquote>)'를 시스템 지침대로 적극 활용한다.",
      },
      meta_title: { type: "string", description: "검색결과 노출용 제목. 핵심 키워드를 앞에, 한국어 30자 내외(검색결과에서 잘리지 않게)" },
      meta_description: {
        type: "string",
        description: "검색결과 설명문(스니펫). 키워드 포함 + 클릭 유도, 한국어 75자 내외",
      },
      faq: {
        type: "array",
        description: "본문에서 다 못 푼, 검색한 사람이 '추가로' 검색할 만한 실제 질문 3~5개. 답은 짧고 정확하게(자기완결). 본문 내용 단순 반복·억지 채우기 금지.",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            answer: { type: "string" },
          },
          required: ["question", "answer"],
        },
      },
      tags: {
        type: "array",
        description:
          "워드프레스 태그 3~5개(한국어 명사형). SEO 규칙을 지킬 것: " +
          "① 여러 글에 다시 쓸 수 있는 '재사용 가능한' 주제어로(예: '강아지 분리불안', '실내 훈련'). 이 글에만 해당하는 너무 좁은 말 금지. " +
          "② 글 제목을 그대로 복사 금지, 문장형 금지. " +
          "③ '정보·일상·꿀팁' 같은 막연한 말 금지. " +
          "④ 핵심 키워드와 거의 같은 중복 태그 금지(서로 다른 측면을 담을 것).",
        items: { type: "string" },
      },
      write_note: {
        type: "string",
        description:
          "글쓴이(블로그 운영자)에게 보여줄 짧은 메모 1~2문장. 이 키워드의 검색 의도를 어떻게 파악했고, 왜 이런 소제목·순서·구성으로 썼는지 담백하게 설명한다. 자기소개·인사·메타 표현 없이. 본문에는 절대 포함하지 않는다.",
      },
    },
    required: ["title", "body_html", "meta_title", "meta_description", "faq", "tags"],
  },
};

// ★실시간 웹 검증 — 모델의 낡은 기억(예금자보호 5천만, 옛 금리 등)이 글에 실리는 것을 원천 차단.
//  시점 민감 수치는 검색으로 확인 후 서술(시스템 프롬프트 [실시간 검증] 지침과 세트).
//  비용: 검색 1회 ≈ $0.01 — max 4회 = 글당 최대 ~56원 추가(마진 내).
const WEB_SEARCH_TOOL = {
  type: "web_search_20260209",
  name: "web_search",
  max_uses: 4,
} as unknown as Anthropic.Tool;


function clamp(text: string, max: number): string {
  const trimmed = (text ?? "").trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max);
}

/** 태그 정리: 문자열만, 공백 제거, 중복 제거, 빈 값 제거, 최대 5개·각 30자 */
function cleanTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    if (typeof t !== "string") continue;
    const v = t.trim().replace(/^#/, "").slice(0, 30);
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= 5) break;
  }
  return out;
}

/** Anthropic 모델로 한국어 SEO 글 1편을 생성한다. */
export async function generateArticle(
  input: ArticlePromptInput,
): Promise<GeneratedArticle> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 가 설정되지 않았습니다.");

  // ★타임아웃·재시도 상한(2026-07-24 멈춤 조사) — 기본값은 timeout 무제한·maxRetries=2라
  //  과부하 시 한 번의 생성이 조용히 2회 재시도되며 다분간 '멈춘 것처럼' 보임. 유한 실패로 바꿔 유저가 다시 누르게 한다.
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 120_000 });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  // 한국어는 글자수 기준. 한글 1자 ≈ 1.5~2토큰으로 보고 여유 있게 budget 산정.
  const maxTokens = Math.min(16000, Math.ceil(input.maxWords * 2 + 1200));
  const verify = isTimeSensitive(input);

  const res = await client.messages.create({
    model,
    max_tokens: maxTokens,
    // ★프롬프트 캐싱 — tools→system 순으로 렌더되므로 system 마지막 블록의 breakpoint가 툴 스키마까지 캐싱.
    //   내용은 동일(품질 영향 0), 입력 ~11.7k tokens가 캐시히트 시 0.1배 과금 → 글당 원가 대폭 절감.
    //   시스템 프롬프트에 '오늘 날짜'가 있어 캐시는 하루 단위로 자연 갱신됨.
    system: [{ type: "text" as const, text: buildSystemPrompt(input.vertical, input.channel ?? "naver"), cache_control: { type: "ephemeral" as const } }],
    // ★웹 검색은 시점 민감 글(금융·정책·부동산·이슈)에만 — 여행·레시피 등엔 불필요(비용·지연·쿼터 절감).
    tools: verify ? [WEB_SEARCH_TOOL, SAVE_TOOL] : [SAVE_TOOL],
    tool_choice: verify ? { type: "any" } : { type: "tool", name: "save_article" },
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });

  const block = res.content.find((b) => b.type === "tool_use" && (b as { name?: string }).name === "save_article");
  if (!block || block.type !== "tool_use") {
    throw new Error("글 생성에 실패했습니다. 다시 시도해 주세요.");
  }

  const raw = block.input as Partial<GeneratedArticle>;

  return finalize(raw, input.keyword);
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
  onUsage?: (u: { model: string; inputTokens: number; outputTokens: number }) => void,
): Promise<GeneratedArticle> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 가 설정되지 않았습니다.");

  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 120_000 }); // ★멈춤 방지 — 무제한 timeout·maxRetries=2 기본값 교체
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  const maxTokens = Math.min(16000, Math.ceil(input.maxWords * 2 + 1200));
  const verify = isTimeSensitive(input);

  // ★fine-grained tool streaming — 기본 모드는 tool input JSON을 서버가 버퍼링해 제목→본문 사이 40초대 공백 발생(실측).
  //  베타를 켜면 델타가 실시간으로 흘러 갭 0.4s. 파서(extractJsonString)는 부분 JSON 내성이라 안전.
  const stream = client.beta.messages.stream({
    betas: ["fine-grained-tool-streaming-2025-05-14"],
    model,
    max_tokens: maxTokens,
    // ★프롬프트 캐싱 — generateArticle과 동일 프리픽스(캐시 공유). 내용 변경 없음(품질 영향 0).
    system: [{ type: "text" as const, text: buildSystemPrompt(input.vertical, input.channel ?? "naver"), cache_control: { type: "ephemeral" as const } }],
    // ★웹 검색은 시점 민감 글(금융·정책·부동산·이슈)에만 — 여행·레시피 등엔 불필요(비용·지연·쿼터 절감).
    tools: verify ? [WEB_SEARCH_TOOL, SAVE_TOOL] : [SAVE_TOOL],
    tool_choice: verify ? { type: "any" } : { type: "tool", name: "save_article" },
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });

  let acc = "";
  let lastBody = "";
  let lastTitle = "";
  let inSave = false; // ★웹서치 블록의 input_json_delta가 섞이지 않게 — save_article 블록만 수집
  for await (const event of stream) {
    if (event.type === "content_block_start") {
      inSave = event.content_block.type === "tool_use" && (event.content_block as { name?: string }).name === "save_article";
      continue;
    }
    if (event.type === "content_block_stop") { continue; }
    if (
      inSave &&
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
  // 캐싱 도입 후 input_tokens는 '캐시 제외분'만 나옴 → 비용 모니터링용으로 '과금 등가 토큰'으로 환산해 기록.
  // (캐시 읽기 0.1배, 캐시 쓰기 1.25배 — usage_log 스키마 변경 없이 원가가 정확히 찍히게)
  const u = final.usage;
  const billedEquivalentInput = Math.round(
    (u?.input_tokens ?? 0) + (u?.cache_read_input_tokens ?? 0) * 0.1 + (u?.cache_creation_input_tokens ?? 0) * 1.25,
  );
  onUsage?.({
    model,
    inputTokens: billedEquivalentInput,
    outputTokens: u?.output_tokens ?? 0,
  });
  const block = final.content.find((b) => b.type === "tool_use" && (b as { name?: string }).name === "save_article");
  if (!block || block.type !== "tool_use") {
    throw new Error("글 생성에 실패했습니다. 다시 시도해 주세요.");
  }
  const raw = block.input as Partial<GeneratedArticle>;
  return finalize(raw, input.keyword);
}
