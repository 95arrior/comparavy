# AteFlo Paid Kit Engine

AteFlo is Korea-first and revenue-first. The flagship paid product is **AI 온라인
영업 세팅 키트**.

The product direction is no longer a shortcut directory, a generic prompt-pack
store, or a simple local-business copy kit. Free shortcuts and guide content can
support discovery, but they are not the main business. The main business is a
paid execution package that helps Korean small business owners and service
operators prepare the online setup needed before inquiries, bookings, or sales
can happen.

Paid content protection is part of the product. Public previews can show module
names, benefits, locked outlines, and tiny samples, but they must not expose the
full prompts, templates, detailed checklists, or complete outputs before
payment/access control exists.

## Product Focus

Flagship:

- AI 온라인 영업 세팅 키트

Primary audience:

- 네일샵
- 카페
- 필라테스
- 강아지 미용
- 학원
- 병원·클리닉
- 청소·인테리어
- 1인 서비스업
- 온라인 상담/교육 서비스
- 예약 기반 서비스

Core user problem:

가게나 서비스를 온라인에서 알리고 싶은데 홈페이지, 네이버플레이스,
인스타/SNS, 리뷰 답변, 카카오채널/DM, 이벤트 문구, 결제, 도메인, GA4,
Search Console, SEO 기본 세팅 중 무엇부터 해야 하는지 모른다.

## Positioning

AteFlo sells a button-based execution package, not a list of prompts.

The product should feel like:

사용자가 짧게 답한다 -> 먼저 챙길 세팅 3가지를 본다 -> 잠긴 유료 모듈을
확인한다 -> 전체 패키지에서 필요한 항목을 버튼으로 하나씩 진행한다.

Preferred tone:

- Korean-first
- clear and friendly
- Toss-like guided flow
- one clear next action
- short explanations
- careful claims

Avoid:

- automatic setup claims before automation exists
- guaranteed sales, rankings, leads, bookings, customers, income, hiring, or
  business growth
- fake urgency
- fake discounts
- prompt-count selling
- returning to free shortcut strategy as the main product

## Free Role

The free experience is a diagnostic sample. It should help the user understand
what is missing without giving away the full execution package.

Free diagnostic includes:

- 3 simple chat questions
- 3 missing setup recommendations
- short explanations
- locked module preview
- early-access or checkout CTA

Free diagnostic does not include:

- full website copy
- full Naver Place copy package
- full Instagram content pack
- full review response pack
- full Kakao/DM scripts
- full coupon/event copy set
- full 30-day plan
- full SEO checklist
- full payment/domain/analytics setup guide

## Paid Role

The paid product unlocks a module dashboard. Each module should feel like a
task button, not an article.

Paid modules:

- 홈페이지 만들기
- 네이버플레이스 세팅
- 인스타/SNS 홍보 세트
- 리뷰 답변 시스템
- 카카오채널/DM 응대 문구
- 이벤트·쿠폰 문구
- 결제·도메인·분석·SEO 세팅 체크리스트
- 7일 오픈 플랜

Each paid module should include:

- guided questions
- ready-to-copy prompt/template
- checklist
- next action
- review rules
- repeated use

## Implementation Rules

V1 must be simple and safe:

- chat-style diagnostic
- locked module preview
- paid dashboard concept
- template-based prompts/checklists
- no AI API
- no real automation
- Toss early-access or checkout placeholder only

Do not send raw user input to analytics. Allowed event params are limited to:

- selected_path
- kit_slug
- source_page
- action_location
- step_name
- selected_option_type
- has_custom_input
- has_diagnosis_generated

Never send:

- business name
- location
- service name
- raw answers
- free text

## Payment Rules

Toss Payments is the intended Korea-first checkout provider, but real charges
must not be implemented before product V1 exists.

Rules:

- never expose secret keys client-side
- use 사전 신청하기 or checkout placeholder language until payment is ready
- confirm payments server-side when real checkout is added
- do not imply AteFlo directly installs Toss Payments, domains, analytics, SEO,
  or third-party tools unless that automation exists

## Source Of Truth

Detailed product requirements live in:

- `docs/online-sales-setup-kit.md`
- `docs/paid-content-boundary.md`
- `docs/homepage-builder-module.md`
- `docs/toss-payments-plan.md`
- `docs/implementation-sequence.md`
