# Paid Content Boundary

This document defines what AteFlo can show publicly before payment/access exists
and what must remain locked for the paid product.

AteFlo is Korea-first and revenue-first. The flagship paid product is **AI
온라인 영업 세팅 키트**.

## 1. Public Preview Layer

Public users can see enough to understand the value of the product, but not
enough to use the full execution system without paying.

Public preview can show:

- module names
- module benefits
- tiny examples
- locked workflow outlines
- early access CTA

Public preview pages should be short, product-like, and button-based. They
should create desire for the paid system rather than work like free articles.

## 2. Paid Access Layer

After purchase/access, users can use the full execution system.

Paid access can include:

- guided module questions
- full prompts
- reusable templates
- full checklists
- copy buttons
- next-action steps
- repeated use

Paid modules should help users move through work step by step, not read long
explanations.

## 3. Never Expose Publicly Before Access

Do not publicly expose:

- full prompt sequences
- full templates
- detailed checklists
- module-by-module execution systems
- complete paid outputs

This applies even if a public preview route exists. Public routes can preview
the shape of the module, but not give away the working system.

## 4. Why This Matters

AteFlo sells execution systems, not free articles.

Public pages should show what the paid product helps users accomplish. They
should not provide the full workflow, full prompts, full templates, or complete
outputs that make the product valuable.

## 5. Current Access Status

Current state:

- Real Toss Payments is not implemented yet.
- Auth/access control is not implemented yet.
- Paid dashboard routes are preview-only.

Therefore, all full paid content must remain locked or documentation-only until
payment/access control exists.

## 6. Safe Public Preview Rules

Allowed:

- short module summaries
- locked cards
- locked step names
- tiny sample output
- CTA to 사전 신청하기 or checkout placeholder

Not allowed:

- final reusable prompt blocks
- full copy templates
- complete SEO/domain/deployment instructions
- detailed operational checklists
- raw user input in analytics

## 7. Analytics Boundary

Public preview analytics may send only safe metadata, such as:

- `kit_slug`
- `module_slug`
- `source_page`
- `action_location`

Never send:

- business name
- location
- service name
- raw answers
- free text
