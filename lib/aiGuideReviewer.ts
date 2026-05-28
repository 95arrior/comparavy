import type { Guide } from "@/lib/guides";

export interface AiGuideReview {
  readonly available: boolean;
  readonly passed: boolean;
  readonly score: number;
  readonly verdict: string;
  readonly warnings: readonly string[];
  readonly suggestedFixes: readonly string[];
}

interface ResponsesResult {
  readonly output_text?: string;
  readonly output?: readonly {
    readonly content?: readonly {
      readonly type?: string;
      readonly text?: string;
      readonly refusal?: string;
    }[];
  }[];
}

const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    passed: { type: "boolean" },
    score: { type: "number" },
    verdict: { type: "string" },
    warnings: { type: "array", items: { type: "string" } },
    suggestedFixes: { type: "array", items: { type: "string" } },
  },
  required: ["passed", "score", "verdict", "warnings", "suggestedFixes"],
} as const;

function unavailableReview(): AiGuideReview {
  return {
    available: false,
    passed: false,
    score: 0,
    verdict: "AI editorial review unavailable because OPENAI_API_KEY is not set.",
    warnings: [],
    suggestedFixes: [],
  };
}

function blockedReview(message: string): AiGuideReview {
  return {
    available: true,
    passed: false,
    score: 0,
    verdict: "AI editorial review could not be completed; automatic publishing is blocked.",
    warnings: [message],
    suggestedFixes: ["Retry the AI editorial review before publishing this guide automatically."],
  };
}

function readOutputText(result: ResponsesResult): string | undefined {
  if (result.output_text) {
    return result.output_text;
  }

  for (const output of result.output ?? []) {
    for (const content of output.content ?? []) {
      if (content.type === "refusal") {
        return undefined;
      }

      if (content.type === "output_text" && content.text) {
        return content.text;
      }
    }
  }

  return undefined;
}

function parseReview(value: unknown): AiGuideReview | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const review = value as Record<string, unknown>;

  if (
    typeof review.passed !== "boolean" ||
    typeof review.score !== "number" ||
    !Number.isFinite(review.score) ||
    typeof review.verdict !== "string" ||
    !Array.isArray(review.warnings) ||
    !review.warnings.every((entry) => typeof entry === "string") ||
    !Array.isArray(review.suggestedFixes) ||
    !review.suggestedFixes.every((entry) => typeof entry === "string")
  ) {
    return undefined;
  }

  return {
    available: true,
    passed: review.passed,
    score: Math.max(0, Math.min(100, Math.round(review.score))),
    verdict: review.verdict,
    warnings: review.warnings,
    suggestedFixes: review.suggestedFixes,
  };
}

export async function reviewGuideWithAI(guide: Guide): Promise<AiGuideReview> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return unavailableReview();
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
        instructions:
          "You are a strict editorial reviewer for Comparavy, an AI tool decision engine serving US and global readers. Evaluate the supplied guide as written; do not rewrite it. Decide whether a busy creator can choose a suitable tool in under 60 seconds. Check that the Quick Verdict is specific, recommendations are practical, Best for / Not for / Avoid if tradeoffs are clear through comparison content, the decision path is usable, FAQs answer real concerns, and uncertain readers are directed to /finder. Reject fake testing claims, unsupported certainty, exact current pricing claims, generic filler, or content that would be low-value publishing. Return JSON only through the provided schema. A score of 85 or above should be reserved for publish-ready editorial quality.",
        input: JSON.stringify(guide),
        text: {
          format: {
            type: "json_schema",
            name: "comparavy_editorial_review",
            strict: true,
            schema: REVIEW_SCHEMA,
          },
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      return blockedReview(`OpenAI editorial review request failed with status ${response.status}.`);
    }

    const result = (await response.json()) as ResponsesResult;
    const text = readOutputText(result);

    if (!text) {
      return blockedReview("OpenAI editorial review returned no structured review text.");
    }

    const review = parseReview(JSON.parse(text) as unknown);
    return review ?? blockedReview("OpenAI editorial review returned an invalid response shape.");
  } catch (error) {
    return blockedReview(`OpenAI editorial review failed: ${String(error)}`);
  }
}
