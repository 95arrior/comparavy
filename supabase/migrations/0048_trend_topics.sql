-- 실시간 트렌드 글감 풀 — 크론이 카테고리별로 뉴스+웹검색 종합해 채운다(유저 무관, 공유).
-- 1만 명이 읽어도 비용은 '카테고리 수 × 갱신 횟수'뿐. 유저는 이 풀에서 시드 회전으로 다른 조각을 본다.
create table if not exists public.trend_topics (
  id uuid primary key default gen_random_uuid(),
  category text not null,            -- sub_category(우선) 또는 vertical
  keyword text not null,
  title text not null,
  news_context text,                 -- 생성 시 근거 자료(최신성)
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (category, keyword)
);
create index if not exists trend_topics_cat_idx on public.trend_topics (category, expires_at);
alter table public.trend_topics enable row level security; -- 정책 없음 = 서버(서비스롤)만
