# Toss Payments Plan

Toss Payments is the intended checkout provider for AteFlo's Korea-first paid
product path.

This plan is documentation only. Do not implement real Toss Payments charges
before product V1 exists.

## Current State

Until the paid product is ready, use safe language such as:

- 사전 신청하기
- 전체 패키지 준비 중
- checkout placeholder

Do not imply that real payment is active unless checkout, server-side confirm,
product access, and failure handling are implemented.

## Safety Rules

- Never expose Toss secret keys client-side.
- Never put secret keys in `NEXT_PUBLIC_*` environment variables.
- Do not implement real charges before the V1 product exists.
- Do not store payment-sensitive data beyond what the provider and server flow
  require.
- Do not claim AteFlo installs Toss Payments for the user's business in V1.

## Future Integration Needs

When real checkout is implemented, the integration needs:

- `orderId`
- `amount`
- `orderName`
- `customerEmail` if collected
- success URL
- fail URL
- server-side payment confirm

The confirm step must happen server-side. Client code can start checkout with
safe public configuration, but it must not confirm payment with a secret key.

## Intended Flow

1. User clicks 전체 패키지 열기 or checkout CTA.
2. AteFlo creates or prepares a safe order request.
3. User completes Toss checkout.
4. Toss redirects to success or fail URL.
5. AteFlo confirms payment server-side.
6. AteFlo grants paid dashboard access after successful confirmation.

## Placeholder Flow

Before real checkout:

1. User clicks 사전 신청하기.
2. AteFlo records safe interest event params only.
3. User sees early-access language.
4. No real charge occurs.

Allowed analytics params remain limited to safe event metadata. Do not send raw
business details, service names, locations, or free-text answers.

