import {
  siAirtable,
  siBuffer,
  siCursor,
  siDeepl,
  siElevenlabs,
  siFramer,
  siGithub,
  siGooglegemini,
  siGrammarly,
  siHubspot,
  siMake,
  siN8n,
  siNotion,
  siPerplexity,
  siReplit,
  siSemrush,
  siVeed,
  siZapier,
  type SimpleIcon,
} from "simple-icons";

export interface ToolIconConfig {
  readonly simpleIconSlug?: string;
  readonly iconDomain?: string;
  readonly brandColor?: string;
  readonly forceFavicon?: boolean;
}

const TOOL_ICON_CONFIGS: Record<string, ToolIconConfig> = {
  airtable: {
    simpleIconSlug: "airtable",
    iconDomain: "airtable.com",
    brandColor: "#18BFFF",
  },
  "adobe-firefly": {
    iconDomain: "firefly.adobe.com",
    brandColor: "#ED2224",
  },
  buffer: {
    simpleIconSlug: "buffer",
    iconDomain: "buffer.com",
    brandColor: "#231F20",
  },
  "canva-magic-studio": {
    iconDomain: "canva.com",
    brandColor: "#E72429",
  },
  capcut: {
    iconDomain: "capcut.com",
    brandColor: "#111111",
  },
  chatgpt: {
    iconDomain: "chatgpt.com",
    brandColor: "#10A37F",
  },
  claude: {
    iconDomain: "claude.ai",
    brandColor: "#191919",
    forceFavicon: true,
  },
  "copy-ai": {
    iconDomain: "copy.ai",
    brandColor: "#7C5CFF",
    forceFavicon: true,
  },
  cursor: {
    simpleIconSlug: "cursor",
    iconDomain: "cursor.com",
    brandColor: "#000000",
  },
  descript: {
    iconDomain: "descript.com",
    brandColor: "#7C3AED",
  },
  "deepl-write": {
    simpleIconSlug: "deepl",
    iconDomain: "deepl.com",
    brandColor: "#0F2B46",
  },
  "elevenlabs": {
    simpleIconSlug: "elevenlabs",
    iconDomain: "elevenlabs.io",
    brandColor: "#000000",
  },
  "framer-ai": {
    simpleIconSlug: "framer",
    iconDomain: "framer.com",
    brandColor: "#0055FF",
  },
  frase: {
    iconDomain: "frase.io",
    brandColor: "#8B5CF6",
    forceFavicon: true,
  },
  gamma: {
    iconDomain: "gamma.app",
    brandColor: "#111827",
  },
  gemini: {
    simpleIconSlug: "google-gemini",
    iconDomain: "gemini.google.com",
    brandColor: "#8E75B2",
  },
  "github-copilot": {
    simpleIconSlug: "github",
    iconDomain: "github.com",
    brandColor: "#181717",
  },
  grammarly: {
    simpleIconSlug: "grammarly",
    iconDomain: "grammarly.com",
    brandColor: "#027E6F",
  },
  heygen: {
    iconDomain: "heygen.com",
    brandColor: "#0F766E",
  },
  hubspot: {
    simpleIconSlug: "hubspot",
    iconDomain: "hubspot.com",
    brandColor: "#FF7A59",
  },
  ideogram: {
    iconDomain: "ideogram.ai",
    brandColor: "#7C3AED",
  },
  jasper: {
    iconDomain: "jasper.ai",
    brandColor: "#5B5FF5",
  },
  make: {
    simpleIconSlug: "make",
    iconDomain: "make.com",
    brandColor: "#6D00CC",
  },
  "microsoft-copilot": {
    iconDomain: "copilot.microsoft.com",
    brandColor: "#0078D4",
  },
  midjourney: {
    iconDomain: "midjourney.com",
    brandColor: "#7C3AED",
  },
  murf: {
    iconDomain: "murf.ai",
    brandColor: "#2DD4BF",
  },
  n8n: {
    simpleIconSlug: "n8n",
    iconDomain: "n8n.io",
    brandColor: "#EA4B71",
  },
  "notion-ai": {
    simpleIconSlug: "notion",
    iconDomain: "notion.com",
    brandColor: "#000000",
  },
  notebooklm: {
    iconDomain: "notebooklm.google.com",
    brandColor: "#4285F4",
    forceFavicon: true,
  },
  "otter-ai": {
    iconDomain: "otter.ai",
    brandColor: "#2D9CDB",
  },
  "opusclip": {
    iconDomain: "opus.pro",
    brandColor: "#1D4ED8",
    forceFavicon: true,
  },
  perplexity: {
    simpleIconSlug: "perplexity",
    iconDomain: "perplexity.ai",
    brandColor: "#1FB8CD",
  },
  replit: {
    simpleIconSlug: "replit",
    iconDomain: "replit.com",
    brandColor: "#F26207",
  },
  runway: {
    iconDomain: "runwayml.com",
    brandColor: "#111827",
  },
  semrush: {
    simpleIconSlug: "semrush",
    iconDomain: "semrush.com",
    brandColor: "#FF642D",
  },
  "surfer-seo": {
    iconDomain: "surferseo.com",
    brandColor: "#22C55E",
    forceFavicon: true,
  },
  synthesia: {
    iconDomain: "synthesia.io",
    brandColor: "#0F172A",
  },
  veed: {
    simpleIconSlug: "veed",
    iconDomain: "veed.io",
    brandColor: "#B6FF60",
  },
  writesonic: {
    iconDomain: "writesonic.com",
    brandColor: "#2563EB",
    forceFavicon: true,
  },
  zapier: {
    simpleIconSlug: "zapier",
    iconDomain: "zapier.com",
    brandColor: "#FF4F00",
  },
  "zapier-ai": {
    simpleIconSlug: "zapier",
    iconDomain: "zapier.com",
    brandColor: "#FF4F00",
  },
};

const SIMPLE_ICON_REGISTRY: Record<string, SimpleIcon> = {
  airtable: siAirtable,
  buffer: siBuffer,
  cursor: siCursor,
  deepl: siDeepl,
  elevenlabs: siElevenlabs,
  framer: siFramer,
  github: siGithub,
  "google-gemini": siGooglegemini,
  grammarly: siGrammarly,
  hubspot: siHubspot,
  make: siMake,
  n8n: siN8n,
  notion: siNotion,
  perplexity: siPerplexity,
  replit: siReplit,
  semrush: siSemrush,
  veed: siVeed,
  zapier: siZapier,
};

export function getToolIconConfig(slug: string): ToolIconConfig {
  return TOOL_ICON_CONFIGS[slug] ?? {};
}

export function getSimpleIcon(simpleIconSlug?: string): SimpleIcon | undefined {
  if (!simpleIconSlug) {
    return undefined;
  }

  return SIMPLE_ICON_REGISTRY[simpleIconSlug];
}
