import type { GuideTopic } from "@/data/guideTopics";
import type { GuideLayoutType } from "@/lib/guideTypes";

export type TopicBucketId =
  | "document-pdf-study-notes"
  | "office-document-workflows"
  | "meeting-notes-client-recaps"
  | "social-content-captions"
  | "video-shorts-clips"
  | "ecommerce-product-descriptions"
  | "image-editing-brand-control"
  | "seo-content-briefs"
  | "automation-agents"
  | "coding-app-prototypes"
  | "presentations-slides"
  | "real-estate-listings"
  | "podcast-audio-editing";

export interface CategoryWritingRules {
  readonly id: TopicBucketId;
  readonly label: string;
  readonly allowedVocabulary: readonly string[];
  readonly typicalInput: readonly string[];
  readonly typicalOutput: readonly string[];
  readonly likelyTools: readonly string[];
  readonly commonMistakes: readonly string[];
  readonly usefulExamples: readonly string[];
  readonly bannedIrrelevantVocabulary: readonly string[];
}

export interface EditorialBlueprint {
  readonly guideType: GuideLayoutType;
  readonly title: string;
  readonly topicBucket: TopicBucketId;
  readonly targetReader: string;
  readonly searchIntent: string;
  readonly userPain: string;
  readonly jobToBeDone: string;
  readonly inputMaterial: readonly string[];
  readonly desiredOutput: readonly string[];
  readonly realWorldScenario: string;
  readonly first100WordsAnswer: string;
  readonly workflowSteps: readonly string[];
  readonly mobileWorkflow: readonly string[];
  readonly desktopWorkflow: readonly string[];
  readonly toolRoleMap: readonly { readonly toolSlug: string; readonly toolName: string; readonly role: string }[];
  readonly decisionPath: readonly string[];
  readonly comparisonCriteria: readonly string[];
  readonly previewConcept: {
    readonly previewType: "product_result" | "visual_content_result" | "document_result" | "decision_result" | "calendar_result";
    readonly beforeInput: string;
    readonly afterOutput: string;
    readonly whyItWorks: string;
  };
  readonly exampleResult: string;
  readonly commonMistakes: readonly string[];
  readonly faqQuestions: readonly string[];
  readonly topicSpecificTerms: readonly string[];
  readonly bannedMismatchedTerms: readonly string[];
  readonly nextStepCTA: string;
  readonly categoryLanguage: CategoryWritingRules;
}

export const CATEGORY_WRITING_RULES: Record<TopicBucketId, CategoryWritingRules> = {
  "document-pdf-study-notes": {
    id: "document-pdf-study-notes",
    label: "Document / PDF / study notes",
    allowedVocabulary: ["PDF", "source document", "chapter", "section notes", "quiz questions", "citations", "page references"],
    typicalInput: ["PDFs", "lecture slides", "class notes", "research sources"],
    typicalOutput: ["accurate study notes", "section summaries", "quiz questions", "source-backed extracts"],
    likelyTools: ["NotebookLM", "ChatGPT", "Claude", "Perplexity", "SciSpace"],
    commonMistakes: ["Studying from an unchecked summary", "Removing page context", "Mixing outside sources into a closed-source assignment"],
    usefulExamples: ["A two-page chapter summary with definitions and five quiz questions"],
    bannedIrrelevantVocabulary: ["brand control", "carousel slides", "product photo", "podcast clips", "lead routing", "appointment reminders"],
  },
  "office-document-workflows": {
    id: "office-document-workflows",
    label: "Office documents / summaries",
    allowedVocabulary: ["resume", "cover letter", "contract", "spreadsheet", "summary", "task list", "quiz", "rewrite"],
    typicalInput: ["resume bullets", "cover letter notes", "contracts", "spreadsheets", "voice memos"],
    typicalOutput: ["rewritten resume sections", "cover letter drafts", "contract summaries", "task lists", "study quizzes"],
    likelyTools: ["ChatGPT", "Claude", "Grammarly", "Notion AI", "Microsoft Copilot"],
    commonMistakes: ["Skipping source details", "Turning a rewrite into generic filler", "Missing important names, dates, or constraints"],
    usefulExamples: ["A resume summary with tailored bullets and a checked final version"],
    bannedIrrelevantVocabulary: ["brand colors", "carousel slides", "podcast clips", "lead routing", "image editing"],
  },
  "meeting-notes-client-recaps": {
    id: "meeting-notes-client-recaps",
    label: "Meeting notes / client recaps",
    allowedVocabulary: ["action items", "owners", "decisions", "client recap", "follow-up email", "meeting notes"],
    typicalInput: ["call notes", "transcripts", "agenda items", "client questions"],
    typicalOutput: ["client-ready recap", "action item list", "follow-up email", "decision log"],
    likelyTools: ["Otter.ai", "Fireflies", "Fathom", "Granola", "ChatGPT"],
    commonMistakes: ["Sending unverified owners or dates", "Turning notes into generic minutes", "Dropping client commitments"],
    usefulExamples: ["A recap email with decisions, owners, dates, and open questions"],
    bannedIrrelevantVocabulary: ["brand colors", "image editing", "carousel slides", "SEO briefs", "study notes"],
  },
  "social-content-captions": {
    id: "social-content-captions",
    label: "Social content / captions",
    allowedVocabulary: ["caption", "post angle", "carousel", "slide copy", "audience", "content calendar"],
    typicalInput: ["blog posts", "campaign notes", "brand voice notes", "existing posts"],
    typicalOutput: ["captions", "carousel outline", "post schedule", "short social copy"],
    likelyTools: ["ChatGPT", "Claude", "Canva", "Buffer", "Later"],
    commonMistakes: ["Starting with a generic hook", "Ignoring the source angle", "Posting without checking claims"],
    usefulExamples: ["A seven-slide carousel outline and matching caption"],
    bannedIrrelevantVocabulary: ["citations", "PDF study notes", "appointment routing", "property facts", "audio cleanup"],
  },
  "video-shorts-clips": {
    id: "video-shorts-clips",
    label: "Video / shorts / clips",
    allowedVocabulary: ["clip", "short", "caption burn-in", "timeline", "avatar", "ad creative", "scene"],
    typicalInput: ["long videos", "webinar recordings", "ad scripts", "talking-head footage"],
    typicalOutput: ["short clips", "video ads", "avatar videos", "captioned exports"],
    likelyTools: ["Descript", "OpusClip", "Runway", "HeyGen", "CapCut"],
    commonMistakes: ["Choosing moments before the message is clear", "Trusting auto captions without review", "Using one export for every channel"],
    usefulExamples: ["Three captioned 30-second clips with different opening frames"],
    bannedIrrelevantVocabulary: ["citations", "PDFs", "study notes", "source bibliography", "property listing"],
  },
  "ecommerce-product-descriptions": {
    id: "ecommerce-product-descriptions",
    label: "Ecommerce / Etsy / product descriptions",
    allowedVocabulary: ["listing", "SKU", "product details", "benefits", "photos", "marketplace"],
    typicalInput: ["product notes", "materials", "dimensions", "customer questions", "photos"],
    typicalOutput: ["product descriptions", "listing titles", "bullet points", "translated descriptions"],
    likelyTools: ["ChatGPT", "Copy.ai", "DeepL Write", "Canva"],
    commonMistakes: ["Inventing product claims", "Ignoring marketplace constraints", "Using the same copy for every SKU"],
    usefulExamples: ["An Etsy description with verified materials, size, and care notes"],
    bannedIrrelevantVocabulary: ["citations", "meeting recap", "appointment routing", "podcast transcript", "study notes"],
  },
  "image-editing-brand-control": {
    id: "image-editing-brand-control",
    label: "Image editing / brand control",
    allowedVocabulary: ["product photos", "brand colors", "reference images", "background removal", "ad creative", "style match"],
    typicalInput: ["product photos", "brand colors", "reference images", "social or ad creatives"],
    typicalOutput: ["edited images that match brand style", "clean product mockups", "on-brand ad visuals"],
    likelyTools: ["Canva", "Adobe Firefly", "Photoroom", "Fotor", "Freepik"],
    commonMistakes: ["Letting the background style drift", "Ignoring logo clearance", "Changing the product shape or color"],
    usefulExamples: ["A product image with a removed background, brand-color backdrop, and matching ad crop"],
    bannedIrrelevantVocabulary: ["citations", "drafts", "content repurposing", "blog post", "hooks", "transcript", "study notes", "appointment routing"],
  },
  "seo-content-briefs": {
    id: "seo-content-briefs",
    label: "SEO / content briefs",
    allowedVocabulary: ["search intent", "SERP", "content brief", "outline", "internal links", "keyword cluster"],
    typicalInput: ["target keyword", "SERP notes", "competitor headings", "customer questions"],
    typicalOutput: ["SEO brief", "answer-first outline", "heading structure", "content requirements"],
    likelyTools: ["Frase", "Clearscope", "Surfer SEO", "MarketMuse", "ChatGPT"],
    commonMistakes: ["Writing awkward generated phrases", "Copying competitor structure blindly", "Skipping the searcher problem"],
    usefulExamples: ["A brief with intent, headings, FAQs, and internal link targets"],
    bannedIrrelevantVocabulary: ["brand colors", "avatar training", "appointment reminders", "podcast clips", "product mockup"],
  },
  "automation-agents": {
    id: "automation-agents",
    label: "Automation / agents",
    allowedVocabulary: ["intake", "routing", "trigger", "handoff", "reminder", "follow-up", "approval"],
    typicalInput: ["lead forms", "customer questions", "appointment requests", "task lists"],
    typicalOutput: ["simple automated intake, routing, reminders, or follow-up workflow"],
    likelyTools: ["Zapier", "n8n", "Bardeen", "Gumloop", "Pipedream"],
    commonMistakes: ["Automating before the manual path is clear", "Skipping approval steps", "Letting agents act without logs"],
    usefulExamples: ["A lead form that routes the request, sends a confirmation, and creates a follow-up task"],
    bannedIrrelevantVocabulary: ["blog post hooks", "citation style", "image brand control", "podcast clips", "carousel slides", "caption ideas"],
  },
  "coding-app-prototypes": {
    id: "coding-app-prototypes",
    label: "Coding / app prototypes",
    allowedVocabulary: ["prototype", "repo", "component", "bug", "requirements", "deployment"],
    typicalInput: ["feature idea", "wireframe", "error message", "existing code"],
    typicalOutput: ["working prototype", "code explanation", "bug fix", "implementation plan"],
    likelyTools: ["Cursor", "GitHub Copilot", "Replit", "Claude", "ChatGPT"],
    commonMistakes: ["Skipping requirements", "Accepting code without running it", "Mixing prototype scope with production scope"],
    usefulExamples: ["A simple app prototype with one clear user flow"],
    bannedIrrelevantVocabulary: ["brand colors", "citation style", "podcast clips", "property listing", "carousel captions"],
  },
  "presentations-slides": {
    id: "presentations-slides",
    label: "Presentations / slides",
    allowedVocabulary: ["deck", "slides", "speaker notes", "proposal", "outline", "visual hierarchy"],
    typicalInput: ["proposal notes", "SOPs", "research notes", "meeting goals"],
    typicalOutput: ["client deck", "training slides", "one-page business plan", "speaker notes"],
    likelyTools: ["Gamma", "Canva", "Beautiful.ai", "ChatGPT"],
    commonMistakes: ["Letting slides invent facts", "Using too much text per slide", "Skipping brand or audience review"],
    usefulExamples: ["A six-slide client proposal deck with a clear ask"],
    bannedIrrelevantVocabulary: ["citation style", "podcast clips", "appointment routing", "product photo edits"],
  },
  "real-estate-listings": {
    id: "real-estate-listings",
    label: "Real estate listings",
    allowedVocabulary: ["property notes", "MLS", "listing description", "features", "compliance review", "buyer questions"],
    typicalInput: ["verified property facts", "room notes", "neighborhood notes", "agent remarks"],
    typicalOutput: ["accurate listing description", "feature bullets", "showing notes"],
    likelyTools: ["ChatGPT", "Claude", "Grammarly", "Copy.ai"],
    commonMistakes: ["Inventing amenities", "Using unsupported neighborhood claims", "Skipping broker review"],
    usefulExamples: ["A listing paragraph built only from verified property facts"],
    bannedIrrelevantVocabulary: ["citations", "carousel hooks", "podcast clips", "brand image control", "study notes"],
  },
  "podcast-audio-editing": {
    id: "podcast-audio-editing",
    label: "Podcast / audio editing",
    allowedVocabulary: ["audio cleanup", "noise reduction", "transcript", "clip selection", "captions", "episode"],
    typicalInput: ["podcast recordings", "episode transcript", "guest notes", "raw audio"],
    typicalOutput: ["clean audio", "short clips", "captioned exports", "show notes"],
    likelyTools: ["Descript", "Krisp", "OpusClip", "Vizard AI"],
    commonMistakes: ["Over-cleaning voices", "Choosing clips before audio is clear", "Trusting captions without review"],
    usefulExamples: ["A cleaned episode plus three captioned clips"],
    bannedIrrelevantVocabulary: ["citation style", "PDF study notes", "property listing", "image brand control", "lead routing"],
  },
};

function normalize(value: string): string {
  return value.toLowerCase();
}

export function classifyTopicBucket(topic: GuideTopic): TopicBucketId {
  const text = normalize(
    `${topic.slug} ${topic.title} ${topic.searchIntent} ${topic.useCase} ${topic.contentGap} ${topic.uniqueAngle} ${topic.notes} ${topic.toolCategories.join(" ")}`,
  );

  if (/\b(image|photo|photos|mockup|thumbnail|brand control|brand colors|firefly|photoroom)\b/.test(text)) return "image-editing-brand-control";
  if (/\b(agent|automation|automate|intake|routing|lead form|appointment|reminder|zapier|n8n)\b/.test(text)) return "automation-agents";
  if (/\b(resume|cover letter|contract|spreadsheet|voice memo|task list|study quiz|quiz generation|quiz)\b/.test(text)) return "office-document-workflows";
  if (/\b(seo|brief|serp|keyword|ai overview|content planning)\b/.test(text)) return "seo-content-briefs";
  if (/\b(podcast|audio|recording|episode)\b/.test(text)) return "podcast-audio-editing";
  if (/\b(video|shorts|clip|avatar|ad creative|webinar)\b/.test(text)) return "video-shorts-clips";
  if (/\b(etsy|ecommerce|product description|listing copy|product)\b/.test(text)) return "ecommerce-product-descriptions";
  if (/\b(meeting|recap|action item|sales call|client follow)\b/.test(text)) return "meeting-notes-client-recaps";
  if (/\b(carousel|caption|social|content calendar|instagram|post)\b/.test(text)) return "social-content-captions";
  if (/\b(code|coding|app prototype|landing page|no-code|prototype)\b/.test(text)) return "coding-app-prototypes";
  if (/\b(deck|slides|presentation|proposal|training)\b/.test(text)) return "presentations-slides";
  if (/\b(real estate|property|mls|listing description)\b/.test(text)) return "real-estate-listings";
  return "document-pdf-study-notes";
}

function unique(values: readonly string[]): string[] {
  return values
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter((value, index, all) => value.length > 0 && all.indexOf(value) === index);
}

function articleTitle(topic: GuideTopic, guideType: GuideLayoutType): string {
  if (guideType !== "how-to" || /^how to\b/i.test(topic.title)) {
    return topic.title;
  }

  return `How to ${topic.searchIntent.replace(/\s+with ai$/i, "")} with AI`;
}

export function buildEditorialBlueprint({
  topic,
  guideType,
  tools,
}: {
  readonly topic: GuideTopic;
  readonly guideType: GuideLayoutType;
  readonly tools: readonly { readonly tool: { readonly slug: string; readonly name: string; readonly category: string; readonly useCases: readonly string[] } }[];
}): EditorialBlueprint {
  const topicBucket = classifyTopicBucket(topic);
  const categoryLanguage = CATEGORY_WRITING_RULES[topicBucket];
  const title = articleTitle(topic, guideType);
  const firstTool = tools[0]?.tool.name ?? "the best matched tool";
  const secondTool = tools[1]?.tool.name ?? "the second matched tool";
  const thirdTool = tools[2]?.tool.name ?? "the fallback tool";
  const inputMaterial = unique([...categoryLanguage.typicalInput, topic.useCase]);
  const desiredOutput = unique([...categoryLanguage.typicalOutput, topic.searchIntent]);
  const toolRoleMap = tools.slice(0, 5).map(({ tool }, index) => ({
    toolSlug: tool.slug,
    toolName: tool.name,
    role:
      index === 0
        ? `Primary tool for turning ${inputMaterial[0]} into ${desiredOutput[0]}`
        : index === 1
          ? `Second-pass tool when ${desiredOutput[0]} needs a different format, stronger controls, or validation`
          : index === 2
            ? `Review or finishing tool after the main output is checked`
            : `Optional fallback for ${tool.category.replace(/-/g, " ")} needs in this workflow`,
  }));

  const workflowSteps = [
    `Prepare the real input: ${inputMaterial.slice(0, 3).join(", ")}.`,
    `Define the target output before opening tools: ${desiredOutput.slice(0, 2).join(" or ")}.`,
    `Use ${firstTool} for the first usable pass and ask it to preserve the constraints that matter in ${categoryLanguage.label}.`,
    `Check the result against the input, then use ${secondTool} only if the output needs a format change or stronger second pass.`,
    `Finish with a human review and use ${thirdTool} only for cleanup, export, or a lighter fallback.`,
  ];

  const decisionPath =
    guideType === "tool-decision"
      ? [
          `If your input is ${inputMaterial[0]}, start with ${firstTool}.`,
          `If you need ${desiredOutput[1] ?? desiredOutput[0]} or more control, compare ${secondTool}.`,
          `If setup speed matters more than depth, test ${thirdTool} on the same input.`,
          `If none of the outputs preserve ${categoryLanguage.allowedVocabulary[0]}, do not publish or send the result yet.`,
        ]
      : [
          `If the input is ready, start with ${firstTool}.`,
          `If the output changes format, bring in ${secondTool}.`,
          `If the result is correct but rough, finish with ${thirdTool} or manual review.`,
        ];

  return {
    guideType,
    title,
    topicBucket,
    targetReader: topic.audience,
    searchIntent: topic.searchIntent,
    userPain: topic.userPain,
    jobToBeDone: `Turn ${inputMaterial[0]} into ${desiredOutput[0]} that ${topic.audience} can review and use.`,
    inputMaterial,
    desiredOutput,
    realWorldScenario: `${topic.audience} have ${inputMaterial.slice(0, 2).join(" and ")} and need ${desiredOutput[0]} without drifting into an unrelated workflow.`,
    first100WordsAnswer:
      guideType === "how-to"
        ? `Start with ${inputMaterial[0]}, decide that the output must be ${desiredOutput[0]}, use ${firstTool} for one reviewable version, and check it before changing formats or adding another tool.`
        : `Choose ${firstTool} first for ${desiredOutput[0]} from ${inputMaterial[0]}; use ${secondTool} when the job needs more control, and avoid publishing anything that drops the original constraints.`,
    workflowSteps,
    mobileWorkflow: [
      `On mobile, keep the task to one input and one output: ${inputMaterial[0]} to ${desiredOutput[0]}.`,
      `Use the phone for quick review, small edits, approvals, or export checks, not broad side-by-side comparison.`,
    ],
    desktopWorkflow: [
      `On desktop, keep the input, AI output, and final editor visible side by side.`,
      `Use desktop for file handling, comparison, layout control, longer review, and final export.`,
    ],
    toolRoleMap,
    decisionPath,
    comparisonCriteria: unique([
      ...categoryLanguage.allowedVocabulary.slice(0, 4),
      "input fit",
      "output control",
      "review effort",
      "mobile usefulness",
      "desktop depth",
    ]),
    previewConcept: {
      previewType: "document_result",
      beforeInput: `${inputMaterial[0]} that is rough, incomplete, or not yet shaped for ${desiredOutput[0]}.`,
      afterOutput: `${desiredOutput[0]} with clear sections, review notes, and no unsupported performance or success claims.`,
      whyItWorks:
        "The preview must be a mobile-readable, output-matched result frame near the top, with crawlable HTML text, blur-to-focus reveal support, reduced-motion fallback, and a compact AI Shortcut brief below it.",
    },
    exampleResult: `Example result: ${desiredOutput[0]} built from ${inputMaterial[0]}, with the original constraints preserved and the final review notes resolved.`,
    commonMistakes: categoryLanguage.commonMistakes,
    faqQuestions: [
      `What input do I need before using AI for ${topic.searchIntent}?`,
      `Which tool should I start with for ${desiredOutput[0]}?`,
      `What should I check before I use the result?`,
      `Can I finish this workflow on a phone, or should I use a computer?`,
    ],
    topicSpecificTerms: unique([...categoryLanguage.allowedVocabulary, ...inputMaterial, ...desiredOutput]),
    bannedMismatchedTerms: unique(categoryLanguage.bannedIrrelevantVocabulary),
    nextStepCTA: "Use the AteFlo finder at /finder for a recommendation matched to your workflow and budget.",
    categoryLanguage,
  };
}
