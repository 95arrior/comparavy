import type { GuideLayoutType } from "@/lib/guideTypes";

export const bannedGenericPhrases = [
  "selected for this guide",
  "core workflow",
  "fits your situation",
  "strong option",
  "useful for this use case",
  "different workflow",
  "final cleanup",
  "rough content that needs rewriting or repackaging",
  "first draft",
  "citation style",
  "good option",
  "this tool is best because it helps",
  "in today's digital world",
  "leverage ai",
  "unlock productivity",
] as const;

export const weakPhrasePatterns = [
  "\\bAI can help\\b",
  "\\bsave time and boost productivity\\b",
  "\\bgame changer\\b",
  "\\brevolutionize\\b",
  "\\bpowerful tool\\b",
  "\\brobust solution\\b",
  "\\bstreamline your workflow\\b",
] as const;

export const requiredHowToSections = [
  "quickAnswer",
  "realWorldScenario",
  "whatYouNeed",
  "steps",
  "mobileUseCase",
  "desktopUseCase",
  "toolsYouCanUse",
  "exampleResult",
  "commonMistakes",
  "faqs",
  "finderCTA",
] as const;

export const requiredToolDecisionSections = [
  "quickVerdict",
  "decisionPath",
  "bestPicksBySituation",
  "comparisonRows",
  "recommendedTools",
  "whoShouldUseThis",
  "whoShouldAvoidThis",
  "faqs",
  "finalVerdict",
  "finderCTA",
] as const;

export const requiredIncomeSections = [
  "realityCheck",
  "skillNeeded",
  "firstStep",
  "steps",
  "toolsYouCanUse",
  "timeEstimate",
  "mistakesToAvoid",
  "faqs",
  "finalVerdict",
] as const;

export const requiredTrendLedSections = [
  "quickDecision",
  "whatChanged",
  "whatToAvoid",
  "bestPicksBySituation",
  "comparisonRows",
  "steps",
  "faqs",
  "finalVerdict",
] as const;

export const topicMismatchRules = {
  mustUseTopicSpecificLanguage: true,
  rejectBannedBucketTerms: true,
  rejectWrongWorkflowVocabulary: true,
  requireInputAndOutputInQuickAnswer: true,
} as const;

export const minimumDepthRules = {
  first100WordsMustAnswerProblem: true,
  howToConcreteStepMinimum: 4,
  toolDecisionBranchMinimum: 4,
  minimumTopicSpecificFaqs: 3,
  requireExampleResultForHowTo: true,
  requireMobileOrDesktopSpecificity: true,
  requireToolRolesMappedToWorkflow: true,
} as const;

export const faqQualityRules = {
  rejectGenericQuestions: [
    "what is",
    "how does",
    "is ai worth it",
    "which ai tool is best",
    "can i use ai",
  ],
  requireTaskOrToolOrSourceMention: true,
  requireActionableAnswer: true,
} as const;

export const quickAnswerRules = {
  answerWithinFirst100Words: true,
  includeReaderJob: true,
  includeStartingInput: true,
  includeDesiredOutput: true,
  includeFirstAction: true,
  includeReviewWarning: true,
  rejectGenericAiBackground: true,
} as const;

export const decisionPathRules = {
  requireBestStartingTool: true,
  requireSecondBestCondition: true,
  requireAvoidTopPickCondition: true,
  requireBranchingIfThenLogic: true,
  rejectRepeatedBestForAvoidIf: true,
} as const;

export const guideTypeStandards: Record<GuideLayoutType, string[]> = {
  "how-to": [
    "Solve one concrete problem before discussing tools.",
    "The first 100 words must name the input, output, first action, and review step.",
    "Show one primary generated prompt, where to paste it, and what finished output to expect.",
    "Keep optional prompt-builder details behind a More details toggle when useful.",
    "Use a checking checklist instead of a separate public review prompt unless the topic truly needs one.",
    "The prompt must include topic-specific output sections, missing-detail handling, and safety rules that prevent the most likely bad output for that task.",
    "Example input and example output must show what a real user can paste and what a good finished result looks like.",
    "Put the practical workflow before tools.",
    "Every step needs action, reason, and expected output.",
    "Mobile and desktop guidance must describe different realistic situations.",
    "Tools must support the workflow, not dominate the article.",
  ],
  "tool-decision": [
    "Help the reader choose between tools quickly.",
    "Quick Verdict must name the best starting tool, second-best condition, and avoid condition.",
    "When prompts are included, the public page should use one primary generated prompt instead of multiple prompt choices.",
    "Prompts must start with the actual task, work in common AI chat tools, include clear placeholders, and avoid AteFlo-only language.",
    "Include review or verification guidance before the reader uses the output.",
    "The prompt must be specific enough that it cannot be replaced by a vague request like summarize this or write this for me.",
    "Example results must show realistic, review-ready output instead of generic summaries.",
    "Decision path must use branching If/Then logic.",
    "Compare tools by real criteria tied to the reader's input and output.",
    "Best for and Avoid if text must be distinct for every tool.",
  ],
  income: [
    "Be realistic about skill, effort, cost, and limitations.",
    "No guaranteed income or get-rich-quick language.",
    "Explain the first realistic service offer and first step.",
    "Show how tools support delivery quality, not effortless income.",
  ],
  "trend-led": [
    "Convert a trend into a practical choice.",
    "Do not claim breaking news without sources.",
    "Explain what to use, what to avoid, and why it matters to the reader now.",
    "Include a practical workflow or decision path.",
  ],
};

export function guideTypeStandardForPrompt(guideType: GuideLayoutType): string {
  return guideTypeStandards[guideType].map((rule) => `- ${rule}`).join("\n");
}

export const comparavyGoldStandardPrompt = [
  "AteFlo Gold Standard Writing System:",
  "The article must deliver an instant useful answer in the first 100 words.",
  "Write for the searcher's job, pain, desired result, and next action.",
  "Do not start with generic AI background.",
  "Do not make users read tool cards before understanding the solution.",
  "A how-to guide solves the workflow; a tool-decision guide ranks tools only after the choice logic is clear.",
  "Use concrete inputs, outputs, review steps, mobile situations, desktop situations, and example results.",
  "Every shortcut must pass the Prompt Builder Usability Test: use one primary generated prompt on the public page, keep optional form fields behind a More details toggle when useful, explain that filling in details improves the result but is not required, make the prompt usable in ChatGPT, Claude, Gemini, Copilot, or another AI chat tool, avoid internal AteFlo-only prompt language, include safety rules when needed, and use checklist review guidance instead of multiple public prompt choices.",
  "Every generated prompt must pass the AteFlo Prompt Quality Standard: it must be topic-specific, better than a generic AI request, start with the actual task, include user-filled fields, define the finished output, include output structure, include missing-detail handling, include topic-specific safety rules, avoid internal AteFlo-only wording, and produce the result promised by the title.",
  "Every shortcut must account for example input, expected good output traits, common bad output risks, and prompt rules that prevent those risks, without exposing a technical benchmark section to readers.",
  "Apply the Prompt Quality Gate: reject or downgrade any guide when the prompt feels generic, could be replaced by 'summarize this', lacks output structure, lacks missing-detail handling, lacks topic-specific safety rules, does not clearly produce the promised result, or feels identical across different topics.",
  "Reject filler, fake testing, fake certainty, repeated tool-card language, and unsupported claims.",
].join(" ");
