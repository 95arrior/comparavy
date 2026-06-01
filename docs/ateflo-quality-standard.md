# AteFlo Quality Standard

A public AteFlo shortcut must help a reader finish one clear job with a
copy-ready prompt workflow. Public pages should be strong enough to serve as
examples of the product standard, not just acceptable articles.

## Search Intent Gate

- Validate the topic before writing or publishing.
- Prefer task-based long-tail keywords over broad AI keywords.
- Use live Google SERP inspection to confirm the query, competitors, and gap.
- Use Google Trends or Trending Now when the topic depends on current or rising
  interest.
- Use Search Console query data when available.
- Use Keyword Planner data when the owner provides it.
- Reject broad AI topics without a clear input, output, and user job.

## Google Searcher Psychology Gate

Every shortcut must be built for a Google searcher who wants help before they
open an AI tool. The page is not for generic AI enthusiasts. It is for people
who know AI might help, but need structure, examples, prompts, and review
guidance before they paste anything into ChatGPT, Claude, Gemini, Copilot, or
another tool.

Before publishing, answer:

1. Why did this person search Google instead of asking ChatGPT or Claude?
2. What uncertainty are they trying to reduce?
3. What result do they want immediately?
4. What would make them trust this page?
5. What would make them leave?
6. What makes AteFlo faster or safer than asking AI from scratch?

### Searcher Mental States

- Prompt uncertainty: The user knows AI might help, but does not know the right
  prompt.
- Outcome urgency: The user wants a finished result, not a long explanation.
- Risk avoidance: The user does not want AI to invent facts, promises, prices,
  claims, deadlines, or personal details.
- Example seeking: The user wants to see what a good result can look like.
- Trust seeking: The user wants a page that feels more reliable than a random AI
  answer.
- Low confidence: The user may not be advanced with AI tools.
- Mobile impatience: The user may be scanning quickly on a phone and needs the
  action early.
- Reusable workflow desire: The user wants something they can bookmark or
  repeat.

## Search-to-Copy Promise

Every AteFlo shortcut must satisfy the Search-to-Copy Promise.

A visitor who arrives from Google should understand within 10 seconds:

- What they can make.
- What they need to paste or fill in.
- Where the Copy Prompt action is.
- Why this prompt is safer or more structured than asking AI from scratch.

If the page cannot get a search visitor from query intent to Copy Prompt
quickly, do not publish it.

## Differentiation Gate

- Do not publish same-topic how-to and tool-decision pairs too early.
- Do not publish multiple shortcuts that feel like the same template with nouns
  swapped.
- Each public shortcut must add a distinct user job, input type, workflow, or
  review risk.
- Hold topics that mainly repeat an existing published cluster.

## Prompt Quality Gate

- The prompt must be better than a generic AI request.
- The prompt must start with the actual task.
- The prompt must include user-filled fields.
- The prompt must define the finished output.
- The prompt must include topic-specific output sections.
- The prompt must include missing-detail handling.
- The prompt must include do-not-invent or equivalent safety rules.
- The prompt must produce the result promised by the title.
- The prompt must avoid internal AteFlo-only wording.

## Layout and Conversion Gate

- Shortcut detail pages must be action-first.
- Prompt builder must appear before long article content.
- Copy Prompt must be visible early.
- Example output must appear near the prompt.
- Check before using must be topic-specific and close to the action.
- Workflow, tools, FAQ, and supporting article content should appear lower on
  the page.

For users arriving from Google:

- Do not start with long educational intros.
- Do not start with tool comparison unless the query is tool-decision intent.
- Do not bury the prompt builder.
- Show the outcome quickly.
- Show Fill in details early.
- Show Copy Prompt early.
- Show Example output near the prompt.
- Show Check before using before long supporting content.
- Place workflow, tools, and FAQ lower on the page.

Preferred order:

1. Search-intent answer in one or two sentences
2. What you'll make
3. Fill in details
4. Generated prompt
5. Copy Prompt
6. Example output
7. Check before using
8. Supporting content

## Monetization Safety Gate

- No fake testing claims.
- No invented pricing.
- No guaranteed income, sales, ranking, follower growth, or engagement claims.
- No fake popularity, fake helpful counts, fake user stories, or fake
  testimonials.
- No unsupported claims that could create AdSense or trust risk.

## Works With Gate

- Works with tools must be topic-specific.
- Do not default every guide to ChatGPT and Claude.
- Use only tool slugs that exist in `data/tools.ts`.
- Use fallback tools only if no better mapping exists.
- The visible Works with row should help the reader understand where to run the
  workflow, not pad the card.

## Article Failure Tests

Reject or hold a shortcut if:

1. It answers the topic like a normal blog article instead of giving a usable
   prompt workflow.
2. It assumes the user already knows how to prompt AI.
3. It makes the user read too much before seeing the action.
4. The prompt is not meaningfully better than asking "Can you help me with
   this?"
5. The result is not clear enough to justify the search click.
6. The page does not reduce the user's uncertainty.
7. The page does not explain what to check before using the AI output.
8. The topic is searched, but AteFlo cannot provide a stronger output than a
   generic AI answer.
