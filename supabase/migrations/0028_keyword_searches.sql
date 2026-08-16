-- 키워드 발굴 '마지막 검색 결과' 저장: 새로고침·재접속·탭 이동에도 결과가 유지되게.
-- 유저당 1행(최신 검색만). 추천 알고리즘과 무관 — 결과 스냅샷 보관용.
create table if not exists public.keyword_searches (
  user_id uuid primary key references auth.users (id) on delete cascade,
  topic text not null,
  results jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.keyword_searches enable row level security;
drop policy if exists "keyword_searches_own" on public.keyword_searches;
create policy "keyword_searches_own" on public.keyword_searches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
