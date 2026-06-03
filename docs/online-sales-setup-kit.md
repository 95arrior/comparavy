# AI 온라인 영업 세팅 키트

이 문서는 AteFlo의 flagship paid product인 **AI 온라인 영업 세팅 키트**의
source of truth입니다.

Paid content leakage rules are defined in `docs/paid-content-boundary.md`.
The first paid module blueprint is defined in
`docs/homepage-builder-module.md`.

## 1. Product Name

AI 온라인 영업 세팅 키트

## 2. One-Line Promise

가게나 서비스를 온라인에서 손님 받을 준비 상태로 만들기 위해 필요한 문구,
채널 세팅, 홍보 흐름, 결제·도메인·분석·SEO 체크리스트를 순서대로
정리해주는 실행 패키지.

## 3. Plain Korean Explanation

이 키트는 홍보 문구만 만들어주는 서비스가 아닙니다.

홈페이지, 네이버플레이스, 인스타/SNS, 리뷰 답변, 카카오채널, 이벤트 문구,
결제·도메인·분석·SEO 기본 점검까지 온라인에서 손님을 받을 준비를 버튼처럼
하나씩 진행할 수 있게 정리해주는 패키지입니다.

직접 설치가 필요한 항목은 자동 설치라고 말하지 않습니다. 결제, 도메인, 분석,
SEO, 외부 채널 세팅은 V1에서 체크리스트와 준비 순서로 안내합니다.

## 4. Purchase Unlock

구매 후에는 dashboard 형태로 아래 모듈을 열 수 있어야 합니다. 각 모듈은 긴
글이 아니라 버튼 기반 작업처럼 느껴져야 합니다.

- 홈페이지 만들기
- 네이버플레이스 세팅
- 인스타/SNS 홍보 세트
- 리뷰 답변 시스템
- 카카오채널/DM 응대 문구
- 이벤트·쿠폰 문구
- 결제·도메인·분석·SEO 세팅 체크리스트
- 7일 오픈 플랜

## 5. Free vs Paid Boundary

### Free Diagnostic

무료 진단은 사용자가 지금 무엇부터 챙기면 좋은지 알려주는 짧은 샘플입니다.

무료 진단이 제공하는 것:

- 3개의 간단한 채팅 질문
- 빠진 세팅 3가지 진단
- 왜 중요한지에 대한 짧은 설명
- 잠긴 유료 모듈 preview
- 사전 신청하기 또는 checkout CTA

무료 진단이 제공하지 않는 것:

- 전체 홈페이지 문구
- 전체 네이버플레이스 문구 패키지
- 전체 인스타그램 콘텐츠 팩
- 전체 리뷰 답변 팩
- 전체 카카오/DM 스크립트
- 전체 쿠폰/이벤트 문구 세트
- 전체 30일 플랜
- 전체 SEO 체크리스트
- 전체 결제/도메인/분석 세팅 가이드

### Paid Product

유료 제품은 전체 모듈 dashboard를 엽니다.

유료 제품이 제공하는 것:

- 전체 module dashboard
- 모듈별 guided questions
- ready-to-copy prompt/template
- checklist
- next action
- review rules
- repeated use

Full prompts, templates, detailed checklists, and complete paid outputs must
stay locked until payment/access control exists.

## 6. Chat-Guided Diagnostic Flow

Assembly experience는 form-like가 아니라 chat-like여야 합니다.

Rules:

- chips first
- custom input only if needed
- no intimidating form
- no long paragraphs
- no AI API in V1
- no raw input analytics

### Step 1

AteFlo asks:

어떤 일을 하고 계세요?

Suggested chips:

- 네일샵
- 카페
- 필라테스
- 강아지 미용
- 학원
- 병원·클리닉
- 청소·인테리어
- 온라인 서비스
- 직접 입력

### Step 2

AteFlo asks:

지금 어디에서 손님을 받고 있나요?

Suggested chips:

- 네이버플레이스
- 인스타그램
- 블로그
- 카카오채널
- 홈페이지
- 아직 없어요
- 잘 모르겠어요

### Step 3

AteFlo asks:

지금 가장 필요한 건 뭐예요?

Suggested chips:

- 문의 늘리기
- 예약 받기
- 구매로 연결하기
- 신뢰도 높이기
- 이벤트 알리기
- 뭐부터 해야 할지 모르겠어요

### Optional Location

지역이나 상권을 넣으면 더 정확해져요.

Example:

서울 성수동, 부산 해운대

Location/free-text values must not be sent to analytics.

## 7. Free Diagnosis Output

Title:

지금 먼저 챙기면 좋은 세팅 3가지예요

Diagnosis item examples:

1. 온라인 첫인상 세팅

손님이 처음 봤을 때 무엇을 하는 곳인지 바로 알 수 있는 소개 문구가
필요해요.

2. 문의/예약 연결 세팅

글을 보고 바로 문의하거나 예약할 수 있는 문구와 버튼 흐름이 필요해요.

3. 노출 점검 세팅

네이버플레이스, 인스타그램, 홈페이지, 분석 도구 중 빠진 부분을 점검해야
해요.

Closing line:

이건 첫 진단이에요.
전체 패키지에서는 필요한 항목을 버튼으로 하나씩 만들 수 있어요.

## 8. Paid Module Details

### 1. 홈페이지 만들기

Problem:

사용자는 자신의 서비스가 온라인에서 어떻게 보이고 설명되어야 하는지 모릅니다.

User inputs:

- 업종
- 서비스 이름 또는 제공 서비스
- 주요 고객
- 지역/상권, 선택 입력
- 문의/예약/구매 방식
- 피해야 할 표현

Outputs:

- 홈페이지 첫 문장
- 서비스 소개문
- CTA 문구
- FAQ
- SEO 제목/설명
- 도메인/배포 체크리스트

Checklist:

- 첫 화면에서 무엇을 하는 곳인지 보이는지
- 문의/예약 버튼 흐름이 있는지
- 가격, 운영시간, 자격, 혜택을 invent하지 않았는지
- 도메인, 배포, Search Console, GA4 확인 항목을 분리했는지

V1 implementation:

- guided prompt/template/checklist

V2 implementation:

- AI-generated page copy inside AteFlo

V3 automation potential:

- landing page generation
- deployment workflow guidance
- template export

### 2. 네이버플레이스 세팅

Problem:

사용자는 네이버플레이스에서 어떤 소개와 정보가 먼저 필요한지 모릅니다.

User inputs:

- 매장/서비스 유형
- 대표 서비스
- 운영 정보
- 사진 종류
- 문의/예약 방식
- 주의할 표현

Outputs:

- 매장/서비스 소개문
- 대표 서비스 설명
- 사진 설명 문구
- FAQ
- 리뷰 유도 문구 without manipulation
- 기본 정보 점검 체크리스트

Checklist:

- 기본 정보가 실제와 맞는지
- 사진 설명이 과장되지 않았는지
- 리뷰 요청이 조작이나 보상 강요로 보이지 않는지
- 예약/문의 연결이 분명한지

V1 implementation:

- prompt/template/checklist

V2 implementation:

- on-site generated Naver Place copy and review checklist

V3 automation potential:

- Naver Place update guidance and external workflow connection if feasible

### 3. 인스타/SNS 홍보 세트

Problem:

사용자는 무엇을 올려야 할지, 글 끝에 어떤 행동을 안내해야 할지 모릅니다.

User inputs:

- 업종
- 이번 주 알릴 내용
- 고객 유형
- 사진/영상 소재
- 원하는 톤
- 문의/예약 방식

Outputs:

- 게시글 주제
- 캡션
- CTA
- 스토리 문구
- 해시태그 방향
- 주간 업로드 흐름

Checklist:

- 실제 사진/영상과 맞는지
- 혜택, 가격, 기간을 invent하지 않았는지
- CTA가 하나인지
- 의료/법률/전문 서비스의 위험 표현을 확인했는지

V1 implementation:

- weekly template and copy prompt

V2 implementation:

- generated captions, story text, and post flow inside AteFlo

V3 automation potential:

- export to content calendar or design tool handoff

### 4. 리뷰 답변 시스템

Problem:

사용자는 좋은 리뷰, 보통 리뷰, 불만 리뷰에 어떻게 답해야 할지 부담을 느낍니다.

User inputs:

- 리뷰 유형
- 리뷰 내용 요약, raw text 저장/analytics 금지
- 매장 톤
- 보상/환불 등 민감 항목 여부
- 공개 답변에서 피해야 할 내용

Outputs:

- 좋은 리뷰 답변
- 보통 리뷰 답변
- 불만 리뷰 답변
- 재방문 유도 문구
- 과장/법적 위험 표현 체크리스트

Checklist:

- 개인정보가 노출되지 않았는지
- 보상, 환불, 사과 범위가 실제 정책과 맞는지
- 고객을 탓하는 표현이 없는지
- fake review나 review manipulation이 아닌지

V1 implementation:

- response templates by review type

V2 implementation:

- generated response drafts with risk warnings

V3 automation potential:

- review platform workflow guidance and saved response library

### 5. 카카오채널/DM 응대 문구

Problem:

문의가 와도 첫 답변, 가격 문의, 예약 문의, 상담 종료 문구가 준비되어 있지
않습니다.

User inputs:

- 업종
- 자주 묻는 질문
- 예약/상담 절차
- 가격 공개 방식
- 운영시간
- 상담 톤

Outputs:

- 첫 응대 문구
- 가격 문의 답변
- 예약 문의 답변
- 자주 묻는 질문 답변
- 상담 종료 문구

Checklist:

- 답변이 너무 길지 않은지
- 다음 행동이 분명한지
- 가격/시간/가능 여부를 invent하지 않았는지
- 민감한 상담은 전문가 확인을 안내하는지

V1 implementation:

- guided scripts and checklist

V2 implementation:

- generated FAQ and DM scripts inside AteFlo

V3 automation potential:

- saved reply snippets and channel handoff guidance

### 6. 이벤트·쿠폰 문구

Problem:

사용자는 이벤트나 쿠폰을 알릴 때 제목, 기간, 조건, 주의사항을 빠뜨리기 쉽습니다.

User inputs:

- 이벤트 목적
- 혜택 내용
- 기간
- 대상
- 사용 조건
- 제외/주의사항

Outputs:

- 이벤트 제목
- 쿠폰 안내문
- 기간 안내문
- 주의사항
- SNS/플레이스용 홍보 문구

Checklist:

- 할인/혜택 조건이 실제와 맞는지
- 기간과 대상이 분명한지
- fake urgency가 없는지
- 환불/중복 사용/예약 조건이 필요한지

V1 implementation:

- event/coupon template and review checklist

V2 implementation:

- generated event variants and channel-specific copy

V3 automation potential:

- campaign calendar export and channel posting workflow guidance

### 7. 결제·도메인·분석·SEO 세팅 체크리스트

Problem:

사용자는 결제, 도메인, 분석, 검색 등록, SEO 기본 항목을 어떤 순서로 준비해야
하는지 모릅니다.

User inputs:

- 판매/예약 방식
- 결제 필요 여부
- 현재 홈페이지 여부
- 도메인 보유 여부
- 분석 도구 설치 여부
- 검색 노출 점검 필요 여부

Outputs:

- Toss Payments 준비 체크
- 도메인 구매 체크
- GA4 설치 체크
- Search Console 등록 체크
- Meta Pixel 선택 체크
- 네이버 서치어드바이저 선택 체크
- SEO 제목/설명 기본 점검

Checklist:

- 결제는 사전 준비와 확인 항목으로만 안내했는지
- secret key를 client-side에 노출하지 않는지
- GA4/Search Console/Pixel은 직접 설치가 필요한 항목으로 안내했는지
- SEO는 기본 제목/설명/색인 점검으로만 표현했는지

V1 implementation:

- checklist/guidance only

V2 implementation:

- personalized setup checklist generated from user state

V3 automation potential:

- partial setup guidance, integration handoff, and verification links

Important:

이 모듈은 V1에서 checklist/guidance로만 표현합니다. 자동 설치를 주장하지
않습니다.

### 8. 7일 오픈 플랜

Problem:

사용자는 세팅을 한 번에 끝내려고 하다가 어디서 멈춰야 할지 모릅니다.

User inputs:

- 업종
- 현재 준비 상태
- 가장 중요한 채널
- 이번 주 목표
- 작업 가능한 시간

Outputs:

- Day 1 to Day 7 action plan
- what to write
- where to post
- what to check
- what to improve

Checklist:

- 하루 작업이 너무 크지 않은지
- 먼저 필요한 세팅부터 배치했는지
- 외부 도구 설치 항목은 체크리스트로 분리했는지
- 성과 보장 표현이 없는지

V1 implementation:

- template-based 7-day plan

V2 implementation:

- generated plan from diagnostic answers and module progress

V3 automation potential:

- calendar export, saved progress, and channel-specific workflows

## 9. V1 / V2 / V3 Roadmap

### V1

- chat-style diagnostic
- locked module preview
- paid dashboard concept
- template-based prompts/checklists
- no AI API
- no real automation
- Toss early access or placeholder

### V2

- AI API generation inside AteFlo
- module outputs generated on-site
- regenerate / tone change / copy / download
- saved business profile if account system exists

### V3

- partial automation
- landing page generation
- export to HTML/Notion/PDF
- Toss Payments integration guidance or connection
- analytics setup guidance
- domain/deployment checklist
- SEO checklist
- channel setup flows
- possible future external integrations

## 10. Pricing Strategy

Pricing is proposed for planning only and does not need to appear in public UI
yet.

Lite:

- 29,000원
- Basic execution package

Pro:

- 79,000원
- Full module dashboard + 7-day plan + expanded templates

Premium:

- 149,000원
- Advanced templates + 업종별 확장팩 + optional review/feedback if offered later

Pricing rules:

- do not show fake discount
- do not use fake urgency
- do not claim revenue guarantee
- do not claim guaranteed sales, bookings, leads, rankings, customers, income,
  hiring, or business growth

## 11. Conversion Flow

Intended conversion path:

Homepage card click
-> loading transition
-> chat-style diagnostic
-> 3 missing setup recommendations
-> locked module dashboard preview
-> 사전 신청하기 or 전체 패키지 열기
-> Toss checkout later
-> paid dashboard access later

Conversion events:

- kit_category_selected
- kit_loading_started
- kit_assembly_started
- chat_step_answered
- setup_diagnosis_generated
- locked_modules_viewed
- kit_unlock_click
- kit_interest_click
- kit_checkout_click

Allowed analytics params only:

- selected_path
- kit_slug
- source_page
- action_location
- step_name
- selected_option_type
- has_custom_input
- has_diagnosis_generated

Do not send:

- business name
- location
- service name
- raw answers
- free text

## 12. Copy Safety

Use careful wording:

- 세팅 체크리스트
- 기본 점검
- 준비 순서
- 문구와 구조를 정리
- 실행 흐름 안내
- 버튼으로 하나씩 진행
- 직접 설치가 필요한 항목은 체크리스트로 안내

Do not use:

- 자동 상위노출
- 매출 보장
- 고객 증가 보장
- 예약 증가 보장
- 광고 효율 보장
- 자동 설치 보장
- 클릭 한 번으로 모든 외부 플랫폼 세팅 완료
