-- 아침 체크인 — 어제 방문자/수익 수동 입력(1일 1행). 수익 추정 생성 금지 원칙: 입력값만 저장·표시.
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,              -- 데이터가 가리키는 날(어제)
  visitors integer,               -- 방문자 수(선택)
  revenue integer,                -- 수익 원 단위(선택 — 승인 전 유저는 미노출)
  created_at timestamptz not null default now(),
  unique (user_id, day)
);
alter table public.checkins enable row level security;
drop policy if exists "checkins_own" on public.checkins;
create policy "checkins_own" on public.checkins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists checkins_user_day_idx on public.checkins (user_id, day desc);
