# Topic and SEO Research Gate

Every new AteFlo shortcut topic must pass this gate before it is written,
approved, or published. The goal is to prove that the topic matches a real
search task and that AteFlo can add a stronger prompt workflow than a normal
ChatGPT answer.

Do not rely on intuition alone.

## Research Requirements

1. Check whether the topic matches a real user search task.
2. Prefer task-based long-tail queries over broad AI keywords.
3. Use Google Trends or Trending Now when the topic depends on current or
   rising interest.
4. Inspect the live Google Search SERP:
   - Are results dominated by giant sites?
   - Are there weak, thin, outdated, or generic results?
   - Is there room for a more practical prompt-builder page?
5. Use Google Keyword Planner data when the owner provides it.
6. Use Search Console query data when available.
7. Hold the topic when the evidence is missing or ambiguous.

## Candidate Topic Output

For each candidate topic, record:

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
- Evidence notes:
  - Google Search query and SERP observation
  - Google Trends or Trending Now observation when relevant
  - Keyword Planner note when provided
  - Search Console note when available

## Pass Standard

A topic can move forward only when all of these are true:

- The query describes a clear task, input, and finished output.
- The primary keyword is specific enough to support a prompt-builder page.
- The SERP leaves room for practical workflow content, not just tool lists.
- AteFlo can provide a stronger workflow than "ask ChatGPT to do it."
- The page can include a concrete prompt builder, example output, and review
  checklist.
- The topic does not create AdSense, trust, legal, medical, financial, privacy,
  or unsupported-claims risk.

## Reject or Hold

Reject or hold a topic if:

- It is too broad.
- It only repeats existing published shortcuts.
- It feels like a generic AI tools article.
- AteFlo cannot provide a stronger prompt workflow than a normal ChatGPT answer.
- It has no clear finished output.
- It creates AdSense or trust risks.

## Gold Brief Storage

Validated topics should store the gate result in `topicResearch` on the matching
gold brief in `data/guideGoldBriefs.ts`. Auto-publish now treats missing or
non-validated research as a hold, including approved-queue publishing.
