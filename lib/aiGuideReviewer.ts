import type { Guide } from "@/lib/guides";

export interface AiGuideReview {
  readonly attempted: boolean;
  readonly available: boolean;
  readonly passed: boolean;
  readonly score: number;
  readonly scoreBreakdown?: {
    readonly copyPasteReadinessScore: number;
    readonly beginnerSimplicityScore: number;
    readonly promptBuilderUsabilityScore: number;
    readonly finishedOutputClarityScore: number;
    readonly safetyTrustScore: number;
  };
  readonly verdict: string;
  readonly warnings: readonly string[];
  readonly suggestedFixes: readonly string[];
  readonly unavailableReason?: string;
  readonly editorialFailureReason?: string;
}

export interface OpenAIReviewDiagnostics {
  readonly apiKeyPresent: boolean;
  readonly modelRawEnvPresent: boolean;
  readonly model: string;
  readonly reasoningEffort: string;
  readonly runningInGitHubActions: boolean;
}

export interface OpenAIReviewProbeResult {
  readonly attempted: boolean;
  readonly available: boolean;
  readonly model: string;
  readonly unavailableReason?: string;
  readonly status?: number;
  readonly statusCategory?: string;
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
    scoreBreakdown: {
      type: "object",
      additionalProperties: false,
      properties: {
        copyPasteReadinessScore: { type: "number" },
        beginnerSimplicityScore: { type: "number" },
        promptBuilderUsabilityScore: { type: "number" },
        finishedOutputClarityScore: { type: "number" },
        safetyTrustScore: { type: "number" },
      },
      required: [
        "copyPasteReadinessScore",
        "beginnerSimplicityScore",
        "promptBuilderUsabilityScore",
        "finishedOutputClarityScore",
        "safetyTrustScore",
      ],
    },
    verdict: { type: "string" },
    warnings: { type: "array", items: { type: "string" } },
    suggestedFixes: { type: "array", items: { type: "string" } },
  },
  required: ["passed", "score", "scoreBreakdown", "verdict", "warnings", "suggestedFixes"],
} as const;

function unavailableReview(): AiGuideReview {
  return {
    attempted: false,
    available: false,
    passed: false,
    score: 0,
    verdict: "AI editorial review unavailable because OPENAI_API_KEY is not set.",
    warnings: [],
    suggestedFixes: [],
    unavailableReason: "AI editorial review skipped locally because OPENAI_API_KEY is not set.",
  };
}

function extractOpenAIErrorCategory(bodyText: string): string | undefined {
  const normalized = bodyText.toLowerCase();

  if (normalized.includes("context_length_exceeded") || normalized.includes("maximum context")) {
    return "context_length_exceeded";
  }

  if (normalized.includes("unsupported_parameter") || normalized.includes("unsupported field")) {
    return "unsupported_parameter";
  }

  if (normalized.includes("invalid_request_error") || normalized.includes("invalid request")) {
    return "invalid_request";
  }

  if (normalized.includes("model_not_found") || normalized.includes("model unavailable")) {
    return "model_unavailable";
  }

  if (normalized.includes("bad request")) {
    return "bad_request";
  }

  return undefined;
}

function classifyOpenAIConnectivityFailure(status: number, bodyText = ""): {
  readonly category: string;
  readonly message: string;
} {
  const normalizedBody = bodyText.toLowerCase();

  if (status === 401) {
    return {
      category: "authentication",
      message: "OpenAI authentication failed. Check GitHub secret OPENAI_API_KEY.",
    };
  }

  if (
    status === 402 ||
    normalizedBody.includes("insufficient_quota") ||
    normalizedBody.includes("billing") ||
    normalizedBody.includes("quota")
  ) {
    return {
      category: "billing",
      message: `OpenAI connectivity check failed with status ${status} (billing).`,
    };
  }

  if (
    normalizedBody.includes("rate limit") ||
    normalizedBody.includes("too many requests") ||
    status === 429
  ) {
    return {
      category: "rate_limit",
      message: `OpenAI connectivity check failed with status ${status} (rate_limit).`,
    };
  }

  if (status === 400) {
    return {
      category: "unexpected_response",
      message: "OpenAI connectivity check failed with status 400 (unexpected_response).",
    };
  }

  if (status === 404 || status === 403) {
    return {
      category: "model",
      message: "OpenAI model unavailable. Check OPENAI_MODEL.",
    };
  }

  if (status >= 500) {
    return {
      category: "unexpected_response",
      message: `OpenAI connectivity check failed with status ${status} (unexpected_response).`,
    };
  }

  return {
    category: "unexpected_response",
    message: `OpenAI connectivity check failed with status ${status} (unexpected_response).`,
  };
}

function blockedReview(message: string): AiGuideReview {
  return {
    attempted: true,
    available: true,
    passed: false,
    score: 0,
    verdict: "AI editorial review could not be completed; automatic publishing is blocked.",
    warnings: [message],
    suggestedFixes: ["Retry the AI editorial review before publishing this guide automatically."],
    editorialFailureReason: message,
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

export function resolveOpenAIModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-5.5";
}

export function getOpenAIReviewDiagnostics(): OpenAIReviewDiagnostics {
  return {
    apiKeyPresent: Boolean(process.env.OPENAI_API_KEY),
    modelRawEnvPresent: Boolean(process.env.OPENAI_MODEL?.trim()),
    model: resolveOpenAIModel(),
    reasoningEffort: process.env.OPENAI_REASONING_EFFORT?.trim() || "n/a",
    runningInGitHubActions: process.env.GITHUB_ACTIONS === "true",
  };
}

function classifyOpenAIHttpFailure(status: number, bodyText = ""): {
  readonly category: string;
  readonly message: string;
} {
  const normalizedBody = bodyText.toLowerCase();
  const parsedCategory = extractOpenAIErrorCategory(bodyText);

  if (status === 401) {
    return {
      category: "unauthorized",
      message: "OpenAI authentication failed. Check GitHub secret OPENAI_API_KEY.",
    };
  }

  if (
    status === 402 ||
    normalizedBody.includes("insufficient_quota") ||
    normalizedBody.includes("billing") ||
    normalizedBody.includes("quota")
  ) {
    return {
      category: "billing_issue",
      message: `OpenAI request failed with status ${status} (billing_issue).`,
    };
  }

  if (
    normalizedBody.includes("rate limit") ||
    normalizedBody.includes("too many requests") ||
    status === 429
  ) {
    return {
      category: "rate_limited",
      message: `OpenAI request failed with status ${status} (rate_limited).`,
    };
  }

  if (status === 400) {
    return {
      category: parsedCategory ?? "invalid_request",
      message: `OpenAI request failed with status 400 (${parsedCategory ?? "invalid_request"}).`,
    };
  }

  if (status === 404 || status === 403) {
    return {
      category: parsedCategory ?? "model_unavailable",
      message: `OpenAI model unavailable (${parsedCategory ?? "model_unavailable"}). Check OPENAI_MODEL.`,
    };
  }

  if (status >= 500) {
    return {
      category: "upstream_error",
      message: `OpenAI request failed with status ${status} (upstream_error).`,
    };
  }

  return {
    category: "request_failed",
    message: `OpenAI request failed with status ${status}.`,
  };
}

export async function probeOpenAIEditorialReview(): Promise<OpenAIReviewProbeResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      attempted: false,
      available: false,
      model: resolveOpenAIModel(),
      unavailableReason: "OPENAI_API_KEY is not set.",
    };
  }

  const model = resolveOpenAIModel();

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: "Reply with exactly: ok",
        max_output_tokens: 16,
        truncation: "auto",
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      const bodyText = await response.text();
      const failure = classifyOpenAIConnectivityFailure(response.status, bodyText);
      return {
        attempted: true,
        available: false,
        model,
        unavailableReason: failure.message,
        status: response.status,
        statusCategory: failure.category,
      };
    }

    const result = (await response.json()) as ResponsesResult;
    const text = readOutputText(result);

    if (!text?.trim()) {
      return {
        attempted: true,
        available: false,
        model,
        unavailableReason: "OpenAI connectivity check returned an empty response.",
        statusCategory: "unexpected_response",
      };
    }

    return {
      attempted: true,
      available: true,
      model,
    };
  } catch (error) {
    return {
      attempted: true,
      available: false,
      model,
      unavailableReason: `OpenAI connectivity check failed: ${String(error)}`,
      statusCategory: "unexpected_response",
    };
  }
}

function parseReview(value: unknown): AiGuideReview | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const review = value as Record<string, unknown>;
  const scoreBreakdown = review.scoreBreakdown as Record<string, unknown> | undefined;

  if (
    typeof review.passed !== "boolean" ||
    typeof review.score !== "number" ||
    !Number.isFinite(review.score) ||
    !scoreBreakdown ||
    typeof scoreBreakdown.copyPasteReadinessScore !== "number" ||
    typeof scoreBreakdown.beginnerSimplicityScore !== "number" ||
    typeof scoreBreakdown.promptBuilderUsabilityScore !== "number" ||
    typeof scoreBreakdown.finishedOutputClarityScore !== "number" ||
    typeof scoreBreakdown.safetyTrustScore !== "number" ||
    typeof review.verdict !== "string" ||
    !Array.isArray(review.warnings) ||
    !review.warnings.every((entry) => typeof entry === "string") ||
    !Array.isArray(review.suggestedFixes) ||
    !review.suggestedFixes.every((entry) => typeof entry === "string")
  ) {
    return undefined;
  }

  return {
    attempted: true,
    available: true,
    passed: review.passed,
    score: Math.max(0, Math.min(100, Math.round(review.score))),
    scoreBreakdown: {
      copyPasteReadinessScore: Math.max(0, Math.min(100, Math.round(scoreBreakdown.copyPasteReadinessScore))),
      beginnerSimplicityScore: Math.max(0, Math.min(100, Math.round(scoreBreakdown.beginnerSimplicityScore))),
      promptBuilderUsabilityScore: Math.max(0, Math.min(100, Math.round(scoreBreakdown.promptBuilderUsabilityScore))),
      finishedOutputClarityScore: Math.max(0, Math.min(100, Math.round(scoreBreakdown.finishedOutputClarityScore))),
      safetyTrustScore: Math.max(0, Math.min(100, Math.round(scoreBreakdown.safetyTrustScore))),
    },
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
    const model = resolveOpenAIModel();
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions:
          "You are a strict editorial reviewer for AteFlo, a US-focused, AdSense-first AI Shortcut Engine. Evaluate the supplied guide as written; do not rewrite it. For how-to guides, score highly only when the article solves one clear reader problem first, the title starts with How to instead of Best AI Tools for, the first 100 words give a useful answer, the workflow includes what the reader needs, step-by-step actions, mobile and desktop guidance, tools used as workflow support, an example result, mistakes to avoid, high-intent FAQs, and a useful next step. For tool-decision guides, score highly only when a busy reader can choose a suitable tool in under 60 seconds, the guide names the best starting tool, explains when the second-best option is better, explains when to avoid the main recommendation, and compares the shortlisted tools on input type, output quality, source reliability, ease of use, speed, mobile suitability, desktop suitability, best use case, and limitation. Apply the Prompt Builder Usability Test: the public page should use one primary generated prompt, optional fields should be behind a More details toggle when useful, review guidance should usually be a checklist instead of a separate public prompt, the prompt must work in ChatGPT, Claude, Gemini, Copilot, or another AI chat tool, the prompt must avoid internal AteFlo-only language, safety rules must appear when missing facts or private details matter, and the builder should explain that filling in details improves the result but is not required. Apply the AteFlo Prompt Quality Standard: the generated prompt must be topic-specific, better than a generic AI request, start with the actual task, include user-filled fields, define the finished output, include output structure, include missing-detail handling, include topic-specific safety rules, avoid internal AteFlo-only wording, and produce the result promised by the title. The guide should account for example input, expected good output traits, common bad output risks, and prompt rules that prevent those risks without exposing a technical benchmark section to readers. Reject or downgrade guides whose prompt feels generic, could be replaced by 'summarize this' or 'write this for me', lacks output structure, lacks missing-detail handling, lacks topic-specific safety rules, does not clearly produce the promised result, or feels identical across different topics. Score the guide with Copy-Paste Readiness Score, Beginner Simplicity Score, Prompt Builder Usability Score, Finished Output Clarity Score, and Safety/Trust Score in scoreBreakdown. Check that Best for / Avoid if / Watch for sections are specific and non-repetitive, the decision path uses real branching logic, FAQs answer high-intent questions, the title matches the evidence available, and uncertain readers are directed to /finder. Reject fake testing claims, unsupported certainty, exact current pricing claims, generic filler, repeated placeholder language, broad tool-list framing for how-to topics, or content that would be low-value publishing. Return JSON only through the provided schema. A score of 85 or above should be reserved for publish-ready editorial quality.",
        input: JSON.stringify(guide),
        text: {
          format: {
            type: "json_schema",
            name: "comparavy_editorial_review",
            strict: true,
            schema: REVIEW_SCHEMA,
          },
        },
        truncation: "auto",
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      const bodyText = await response.text();
      const failure = classifyOpenAIHttpFailure(response.status, bodyText);
      return {
        attempted: true,
        available: false,
        passed: false,
        score: 0,
        verdict: "AI editorial review could not be completed; automatic publishing is blocked.",
        warnings: [failure.message],
        suggestedFixes: ["Retry the AI editorial review before publishing this guide automatically."],
        unavailableReason: failure.message,
      };
    }

    const result = (await response.json()) as ResponsesResult;
    const text = readOutputText(result);

    if (!text) {
      return {
        attempted: true,
        available: false,
        passed: false,
        score: 0,
        verdict: "AI editorial review could not be completed; automatic publishing is blocked.",
        warnings: ["OpenAI editorial review returned no structured review text."],
        suggestedFixes: ["Retry the AI editorial review before publishing this guide automatically."],
        unavailableReason: "OpenAI editorial review returned no structured review text.",
      };
    }

    const review = parseReview(JSON.parse(text) as unknown);

    if (!review) {
      return {
        attempted: true,
        available: false,
        passed: false,
        score: 0,
        verdict: "AI editorial review could not be completed; automatic publishing is blocked.",
        warnings: ["OpenAI editorial review returned an invalid response shape."],
        suggestedFixes: ["Retry the AI editorial review before publishing this guide automatically."],
        unavailableReason: "OpenAI editorial review returned an invalid response shape.",
      };
    }

    return {
      ...review,
      editorialFailureReason:
        review.passed && review.score >= 85
          ? undefined
          : `AI editorial review ran and scored ${review.score}/100, below the publish threshold of 85.`,
    };
  } catch (error) {
    return {
      attempted: true,
      available: false,
      passed: false,
      score: 0,
      verdict: "AI editorial review could not be completed; automatic publishing is blocked.",
      warnings: [`OpenAI editorial review failed: ${String(error)}`],
      suggestedFixes: ["Retry the AI editorial review before publishing this guide automatically."],
      unavailableReason: `OpenAI editorial review failed: ${String(error)}`,
    };
  }
}
