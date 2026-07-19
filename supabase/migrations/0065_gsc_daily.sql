-- ★서치콘솔 성과 루프(2026-07-19) — WP 검색 실적(날짜×페이지×쿼리) 일일 적재. 심은 키워드 vs 실제 노출 실측.
create table if not exists public.gsc_daily (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  page text not null,
  query text not null,
  clicks int not null default 0,
  impressions int not null default 0,
  position numeric,
  article_id uuid,                 -- 슬러그↔키워드 매칭(베스트에포트, null 허용)
  created_at timestamptz not null default now(),
  unique (date, page, query)
);
create index if not exists gsc_daily_date_idx on public.gsc_daily (date desc);
create index if not exists gsc_daily_article_idx on public.gsc_daily (article_id, date desc);
alter table public.gsc_daily enable row level security;
