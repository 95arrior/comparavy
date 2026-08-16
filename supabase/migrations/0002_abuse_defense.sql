-- 어뷰징 방어: rate limit 카운터 테이블
-- Supabase SQL 에디터에서 1회 실행하세요. (0001 이후)

create table if not exists public.rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,              -- 예: 'generate'
  count int not null default 0,
  window_start timestamptz not null default now(),
  primary key (user_id, action)
);

alter table public.rate_limits enable row level security;

create policy "rate_limits self" on public.rate_limits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
