-- ★글감 적중률(2026-08-05 유저 요청: "적중률 재는 기능 만들어주세요, 이번 주 테스트해봐야겠네요").
--
--  왜 필요한가: 8월 4일 유저의 네이버 경제 인기유입검색어 20개 중 우리 글감이 0개였다.
--  그 뒤로 원천을 다섯 개 붙였는데, 지금까지 "잘 될 겁니다"는 내 판단이지 증명이 아니다.
--  ★어느 원천이 진짜 일하는지는 '우리가 낸 글감'과 '실제 유입 검색어'를 맞대봐야만 갈린다.
--
--  구조: served_topics(우리가 낸 것) × inflow_keywords(실제로 들어온 것, 0062에 이미 있음)
--  additive only — 기존 테이블은 건드리지 않는다.

-- 우리가 보드에 실제로 내보낸 글감. 카드가 화면에 뜬 순간 기록된다(발행 여부와 무관 —
-- ★재는 대상은 '우리 추천이 맞았나'지 '유저가 썼나'가 아니다. 둘을 섞으면 원천 평가가 흐려진다).
create table if not exists public.served_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  blog_id uuid,
  date date not null,              -- KST 기준 일자
  keyword text not null,
  norm text not null,              -- 공백 제거·소문자 — 유입 검색어와 맞댈 때 쓰는 열쇠
  seed_source text,                -- gov | calendar | dart | community | rising | news | discover | pool …
  lane text,                       -- trend | steady | homefeed
  vol int,                         -- 서빙 시점 실측 월 검색량(0 = 아직 안 잡힘)
  blog_total int,                  -- 서빙 시점 블로그 문서 수
  preempt boolean not null default false, -- 검색량 0인데 선점형으로 통과시킨 카드인가
  created_at timestamptz not null default now(),
  unique (user_id, date, norm)
);
create index if not exists served_topics_user_date_idx on public.served_topics (user_id, date desc);
create index if not exists served_topics_norm_idx on public.served_topics (norm);
alter table public.served_topics enable row level security;
-- 정책 없음 = 서비스롤 전용(keyword_pool·post_performance와 같은 패턴)

-- 적중 판정 결과 원장. 같은 날을 다시 계산해도 덮어쓴다.
create table if not exists public.topic_hits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  blog_id uuid,
  inflow_date date not null,       -- 유입이 실제로 발생한 날
  served_date date not null,       -- 그 글감을 우리가 낸 날
  keyword text not null,           -- 우리 글감 키워드
  inflow_keyword text not null,    -- 실제 유입 검색어(같지 않을 수 있다 — 부분일치)
  seed_source text,
  lane text,
  inflow int not null default 0,
  lead_days int not null default 0, -- 며칠 먼저 냈나(선점 폭). 0이면 당일
  created_at timestamptz not null default now(),
  unique (user_id, inflow_date, keyword, inflow_keyword)
);
create index if not exists topic_hits_user_date_idx on public.topic_hits (user_id, inflow_date desc);
alter table public.topic_hits enable row level security;
