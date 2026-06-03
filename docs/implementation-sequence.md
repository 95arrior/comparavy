# Implementation Sequence

This sequence keeps AteFlo Korea-first, revenue-first, and focused on **AI
온라인 영업 세팅 키트**.

Do not implement UI, routes, API calls, payment, or new product screens until
the relevant step is intentionally started.

## Exact Next Steps

1. Product blueprint fixed

   Use `docs/online-sales-setup-kit.md` as the source of truth for the flagship
   product, free/paid boundary, modules, roadmap, pricing strategy, conversion
   flow, analytics rules, and safety language.

2. Add paid content boundary rules

   Use `docs/paid-content-boundary.md` to keep full prompts, templates,
   detailed checklists, and complete paid outputs out of public routes until
   payment/access control exists.

3. Reframe old local-business route to online-sales-setup-kit

   Rename/reframe the current local-business product concept only when a UI
   implementation task begins. Preserve existing working routes until the
   redirect or migration is intentionally planned.

4. Build chat-style diagnostic UI

   Build a short, Toss-like chat flow with chips first and custom input only if
   needed. Keep the experience simple and avoid long forms.

5. Show free diagnosis only

   Show 3 missing setup recommendations with short explanations. Do not expose
   full paid module output in the free flow.

6. Show locked module dashboard preview

   Preview the paid modules as locked task buttons. Avoid article-like module
   pages in the preview.

7. Add 사전 신청 CTA

   Use early-access language until the paid dashboard and checkout flow are
   ready. Track only safe analytics params.

8. Create homepage-builder public preview route/panel

   Show what the module does, locked output cards, locked step names, and a tiny
   sample. Do not expose full prompts, templates, detailed checklists, or full
   outputs.

9. Add access gate placeholder

   Add a non-payment placeholder for locked state and future access control.
   Keep full paid content out of public routes.

10. Build paid module UI shell

   Build template-based modules with guided questions, ready-to-copy
   prompts/templates, checklists, next actions, and review rules only behind an
   access gate. V1 has no AI API and no real automation.

11. Prepare Toss checkout

   Add Toss Payments only after product V1 exists. Keep secret keys server-side
   and confirm payments server-side.

12. Add auth/access later

   Add account/access checks before exposing full paid prompts, templates,
   checklists, or reusable outputs.

13. Add full paid module content only after access control exists

   Move complete module systems behind paid access. Public pages remain preview
   only.

14. Add AI API in V2

   Generate module outputs inside AteFlo, including regenerate, tone change,
   copy, download, and saved business profile if an account system exists.

15. Add automation in V3

    Add partial automation, landing page generation, exports, setup guidance,
    domain/deployment checklist, SEO checklist, channel setup flows, and possible
    future external integrations.

## Guardrails

- Do not change guide statuses.
- Do not expose approved/draft/rejected guides.
- Do not send raw user input to analytics.
- Do not add payment code before the payment step.
- Do not add AI API calls before V2.
- Do not add dependencies unless a future implementation task explicitly needs
  them.
- Do not claim automatic installation before automation exists.
