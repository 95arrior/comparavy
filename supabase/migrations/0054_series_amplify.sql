-- 수익 증폭 시스템 — 시리즈(연쇄 페이지뷰) + 증폭 신호 + 배합 가중.
-- 멀티 블로그(Stage 5): user_id → blog_id 전환 지점. 지금은 계정=블로그 1:1.
create table if not exists public.user_series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword text not null,          -- 씨앗 키워드
  title text not null,            -- 시리즈 제목
  arc jsonb not null,             -- [{role, angle}] 3~4화 역할 설계(Haiku)
  total integer not null,
  next_ep integer not null default 2,  -- 1화는 생성 시 소비
  status text not null default 'active', -- active | done
  created_at timestamptz not null default now()
);
alter table public.user_series enable row level security;
drop policy if exists "series_own" on public.user_series;
create policy "series_own" on public.user_series for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.articles add column if not exists series_id uuid;
alter table public.articles add column if not exists episode_index integer;
alter table public.articles add column if not exists hot_at timestamptz;      -- 증폭 신호(반응 좋아요/급등 선택)
alter table public.blog_profiles add column if not exists mix_weights jsonb;  -- 배합 가중 학습(상한·하한은 코드)
