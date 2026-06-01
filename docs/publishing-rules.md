# AteFlo Publishing Rules

Public publishing is paused until current shortcuts have been reworked against
the AteFlo quality standard.

## Current Rule

- Do not publish new shortcuts.
- Do not create new guides just to fill the queue.
- Do not expose approved, draft, rejected, or rework content publicly.
- Keep guide files and slugs intact.
- A guide becomes public only when `status` is `published`.
- Approved guides are review inventory, not public content.

## Required Gates Before Publishing

Every public shortcut must pass:

1. Search Intent Gate
2. Differentiation Gate
3. Prompt Quality Gate
4. Layout and Conversion Gate
5. Monetization Safety Gate
6. Works With Gate

The full standards live in:

- `docs/ateflo-quality-standard.md`
- `docs/editorial/TOPIC_SEO_RESEARCH_GATE.md`
- `docs/editorial/COMPARAVY_WRITING_STANDARD.md`

## Research Evidence

Before writing or publishing, store topic research on the matching gold brief in
`data/guideGoldBriefs.ts` as `topicResearch`.

Required research output:

- Primary keyword
- Secondary keywords
- Likely search intent
- Competing content type
- Content gap AteFlo can fill
- Recommended title
- Recommended meta description
- `searchAliases` and `searchKeywords`
- Why this topic deserves publishing now
- Topic lane:
  - Work/Productivity
  - Money/Business/Selling
  - Fun/Personal/Desire
- Live Google Search/SERP evidence
- Google Trends or Trending Now evidence when relevant
- Keyword Planner note when owner data is provided
- Search Console query note when available

## Hold Conditions

Hold or reject the topic if:

- It is too broad.
- It repeats existing published shortcuts.
- It feels like a generic AI tools article.
- AteFlo cannot provide a stronger prompt workflow than a normal ChatGPT answer.
- It has no clear finished output.
- It creates AdSense, privacy, compliance, or trust risk.
- It lacks topic-specific Works with tools.

## Automation Rule

`scripts/autoPublishGuides.ts` must hold approved-queue publishing and gold-brief
generation when `topicResearch` is missing, incomplete, or not validated. Generic
fallback topics must remain disabled unless they have explicit research evidence.
