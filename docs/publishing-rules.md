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
2. Google Searcher Psychology Gate
3. Search-to-Copy Promise
4. Differentiation Gate
5. Prompt Quality Gate
6. Layout and Conversion Gate
7. Monetization Safety Gate
8. Works With Gate

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

## Future Topic Review Format

Every candidate topic review must include:

- Primary keyword
- Searcher's likely situation
- Why they searched Google instead of using AI directly
- What they want to finish
- What uncertainty they want to reduce
- What they are afraid AI might get wrong
- What would make them trust and use the page
- What would make them leave
- What AteFlo prompt structure will fix
- What proof or reward the page must show
- Whether the page can get them to Copy Prompt quickly
- Publish / hold / reject decision

Do not approve a topic review that only says the topic has AI interest. The
review must explain the searcher's uncertainty, immediate desired outcome, and
why AteFlo is faster or safer than asking AI from scratch.

## Hold Conditions

Hold or reject the topic if:

- It is too broad.
- It repeats existing published shortcuts.
- It feels like a generic AI tools article.
- AteFlo cannot provide a stronger prompt workflow than a normal ChatGPT answer.
- It has no clear finished output.
- It creates AdSense, privacy, compliance, or trust risk.
- It lacks topic-specific Works with tools.
- It cannot satisfy the Search-to-Copy Promise within the first screen.
- It cannot explain what the user should check before using the AI output.
- It repeats generic page boilerplate from another shortcut instead of speaking
  in the language of the topic.
- Its `/shortcuts` card summary is a long article excerpt instead of one short
  value proposition sentence.

## Automation Rule

`scripts/autoPublishGuides.ts` must hold approved-queue publishing and gold-brief
generation when `topicResearch` is missing, incomplete, or not validated. Generic
fallback topics must remain disabled unless they have explicit research evidence.

## Google Searcher Psychology Rule

AteFlo should assume many visitors are not confident prompt writers. They came
from Google because they want a trusted structure, examples, and checks before
using AI. The public page must reward that click quickly:

- Name the finished output early.
- Make the input fields obvious.
- Put Copy Prompt near the action.
- Show an example output.
- Explain what the prompt prevents, such as invented facts, missing owners,
  false product claims, or generic personal wording.

## Topic-Specific Readability Rule

AteFlo pages can share the same action-first layout, but future shortcuts must
not share generic wording. Each published shortcut needs topic-specific:

- Top summary.
- Input fields.
- Generated prompt rules.
- Example output.
- Check before using checklist.
- Tone based on user intent.

Reject or hold any shortcut that repeats phrases like "Build and copy the
prompt first," "Use this shortcut when you want the prompt first," "Read this
after you have the prompt," or "Do the work in order" unless the wording has
been rewritten for the actual topic.

## Card and Layout Rule

The `/shortcuts` card is for scanning, not reading:

- Use one short value proposition sentence only.
- Do not use long multi-sentence summaries.
- Do not repeat generic timing text across cards.

The detail page must keep the prompt builder before long article content. Copy
Prompt, Example output, and Check before using must appear near the action.
Workflow, tools, and FAQ belong lower on the page.
