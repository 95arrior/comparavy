import type { ToolCategory } from "@/types/tool";

export type GuideSkillLevel = "beginner" | "intermediate" | "advanced";

export interface GuideTopic {
  readonly slug: string;
  readonly title: string;
  readonly category: string;
  readonly persona: string;
  readonly useCase: string;
  readonly budgetAngle: string;
  readonly skillLevel: GuideSkillLevel;
  readonly primaryKeyword: string;
  readonly secondaryKeywords: readonly string[];
  readonly targetCategories: readonly ToolCategory[];
  readonly preferredToolSlugs: readonly string[];
  readonly selectionContext: string;
}

export const guideTopics = [
  {
    slug: "best-ai-video-editors-for-youtube-shorts",
    title: "Best AI Video Editors for YouTube Shorts",
    category: "Video",
    persona: "YouTube Shorts creators",
    useCase: "turning ideas or longer recordings into short vertical videos",
    budgetAngle: "Start with an accessible workflow before paying for advanced production features.",
    skillLevel: "beginner",
    primaryKeyword: "best AI video editors for YouTube Shorts",
    secondaryKeywords: ["AI shorts editor", "AI video editing tools", "YouTube short video tools"],
    targetCategories: ["video"],
    preferredToolSlugs: ["capcut", "descript", "runway"],
    selectionContext:
      "Prioritize short-form editing, captions, clip repurposing, and a workflow a creator can review quickly.",
  },
  {
    slug: "best-ai-writing-tools-for-non-native-english-creators",
    title: "Best AI Writing Tools for Non-Native English Creators",
    category: "Writing",
    persona: "non-native English creators",
    useCase: "polishing English content while preserving a personal voice",
    budgetAngle: "Test clarity and tone assistance on real drafts before selecting a paid workflow.",
    skillLevel: "beginner",
    primaryKeyword: "best AI writing tools for non-native English creators",
    secondaryKeywords: ["AI English writing assistant", "writing tools for creators", "AI tone checker"],
    targetCategories: ["writing", "general-assistant"],
    preferredToolSlugs: ["deepl-write", "grammarly", "chatgpt"],
    selectionContext:
      "Favor clarity, tone adjustment, and fast revision while keeping the creator responsible for meaning and facts.",
  },
  {
    slug: "best-free-ai-image-generators-for-social-media",
    title: "Best Free AI Image Generators for Social Media",
    category: "Image Creation",
    persona: "social media creators",
    useCase: "creating post visuals and concepts for social channels",
    budgetAngle: "Use free-plan options to test formats and visual direction before committing.",
    skillLevel: "beginner",
    primaryKeyword: "best free AI image generators for social media",
    secondaryKeywords: ["free AI social images", "AI post graphics", "social media image generator"],
    targetCategories: ["image-generation", "design"],
    preferredToolSlugs: ["ideogram", "adobe-firefly", "leonardo-ai", "canva-magic-studio"],
    selectionContext:
      "Look for quick visual iteration, social-ready concepts, and editing or layout support when needed.",
  },
  {
    slug: "best-ai-automation-tools-for-solopreneurs",
    title: "Best AI Automation Tools for Solopreneurs",
    category: "Automation",
    persona: "solopreneurs",
    useCase: "reducing repetitive admin and content workflow tasks",
    budgetAngle: "Automate one repeatable task first and expand only after it saves measurable effort.",
    skillLevel: "intermediate",
    primaryKeyword: "best AI automation tools for solopreneurs",
    secondaryKeywords: ["AI workflow automation", "no-code automation tools", "solopreneur automation"],
    targetCategories: ["automation"],
    preferredToolSlugs: ["zapier-ai", "make", "n8n"],
    selectionContext:
      "Compare setup effort, integration fit, and the level of technical control required for dependable workflows.",
  },
  {
    slug: "best-ai-seo-tools-for-small-blogs",
    title: "Best AI SEO Tools for Small Blogs",
    category: "SEO and Writing",
    persona: "small blog owners",
    useCase: "researching and drafting useful search-focused articles",
    budgetAngle: "Use AI to speed research and outlines, then invest only when the publishing workflow proves useful.",
    skillLevel: "beginner",
    primaryKeyword: "best AI SEO tools for small blogs",
    secondaryKeywords: ["AI blog SEO tools", "AI content research", "SEO writing assistants"],
    targetCategories: ["writing", "research"],
    preferredToolSlugs: ["writesonic", "perplexity", "chatgpt"],
    selectionContext:
      "Select for research and drafting support, and verify sources and search intent before publishing.",
  },
  {
    slug: "best-ai-caption-tools-for-instagram-reels",
    title: "Best AI Caption Tools for Instagram Reels",
    category: "Video",
    persona: "Instagram creators",
    useCase: "adding readable captions and repurposing short clips",
    budgetAngle: "Validate caption accuracy in a free trial workflow before expanding output.",
    skillLevel: "beginner",
    primaryKeyword: "best AI caption tools for Instagram Reels",
    secondaryKeywords: ["reel captions", "AI subtitle editor", "social video captions"],
    targetCategories: ["video"],
    preferredToolSlugs: ["capcut", "descript", "runway"],
    selectionContext: "Evaluate transcription review, short-form speed, and export-ready presentation.",
  },
  {
    slug: "best-ai-research-tools-for-freelance-consultants",
    title: "Best AI Research Tools for Freelance Consultants",
    category: "Research",
    persona: "freelance consultants",
    useCase: "collecting and synthesizing source material for client briefs",
    budgetAngle: "Start with a focused research brief before increasing tool spending.",
    skillLevel: "intermediate",
    primaryKeyword: "best AI research tools for freelance consultants",
    secondaryKeywords: ["AI research assistant", "consultant research workflow", "source-based AI tools"],
    targetCategories: ["research", "general-assistant"],
    preferredToolSlugs: ["perplexity", "notebooklm", "claude"],
    selectionContext: "Favor visible sources and a reviewable synthesis process for client-facing work.",
  },
  {
    slug: "best-ai-presentation-tools-for-client-proposals",
    title: "Best AI Presentation Tools for Client Proposals",
    category: "Presentations",
    persona: "freelancers",
    useCase: "building clear visual proposals from project notes",
    budgetAngle: "Prototype a proposal format before upgrading for broader brand control.",
    skillLevel: "beginner",
    primaryKeyword: "best AI presentation tools for client proposals",
    secondaryKeywords: ["AI proposal deck", "presentation generator", "freelance pitch slides"],
    targetCategories: ["presentations", "design"],
    preferredToolSlugs: ["gamma", "canva-magic-studio", "chatgpt"],
    selectionContext: "Balance fast structure, visual editing, and careful review of client-specific claims.",
  },
  {
    slug: "best-ai-website-tools-for-creator-landing-pages",
    title: "Best AI Website Tools for Creator Landing Pages",
    category: "Website Creation",
    persona: "creators",
    useCase: "launching a simple landing page for an offer or portfolio",
    budgetAngle: "Test messaging and layout before paying for a full publishing workflow.",
    skillLevel: "beginner",
    primaryKeyword: "best AI website tools for creator landing pages",
    secondaryKeywords: ["AI landing page builder", "creator website tools", "no-code AI website"],
    targetCategories: ["website", "design"],
    preferredToolSlugs: ["framer-ai", "canva-magic-studio", "chatgpt"],
    selectionContext: "Look for quick iteration while reviewing accessibility, copy, and published details.",
  },
  {
    slug: "best-ai-podcast-repurposing-tools-for-creators",
    title: "Best AI Podcast Repurposing Tools for Creators",
    category: "Video and Audio",
    persona: "podcast creators",
    useCase: "turning recorded conversations into short reusable content",
    budgetAngle: "Repurpose a single episode before committing to a recurring production stack.",
    skillLevel: "intermediate",
    primaryKeyword: "best AI podcast repurposing tools for creators",
    secondaryKeywords: ["AI podcast clips", "podcast transcription tools", "content repurposing AI"],
    targetCategories: ["video", "audio"],
    preferredToolSlugs: ["descript", "capcut", "elevenlabs"],
    selectionContext: "Compare editing, transcription, clip creation, and narration needs separately.",
  },
] satisfies readonly GuideTopic[];
