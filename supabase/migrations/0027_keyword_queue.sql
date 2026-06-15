-- 키워드 예약 큐: 추천에서 고른 키워드를 '아직 생성 안 한 상태'로 담아두는 대기열.
-- 첫 1개만 즉시 생성(done), 나머지는 queued로 예정일(scheduled_for)에 맞춰 대기. (자동 생성 cron은 2-B)
create table if not exists public.keyword_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  keyword text not null,
  status text not null default 'queued',   -- 'queued' | 'generating' | 'done' | 'failed'
  scheduled_for date,                       -- 발행/생성 예정일 (자동 분산)
  article_id uuid references public.articles (id) on delete set null, -- 생성 완료 시 연결
  position int not null default 0,          -- 담은 순서(정렬용)
  created_at timestamptz not null default now()
);
create index if not exists keyword_queue_user_idx on public.keyword_queue (user_id, scheduled_for, position);

-- RLS: 본인 행만
alter table public.keyword_queue enable row level security;
drop policy if exists "keyword_queue_own" on public.keyword_queue;
create policy "keyword_queue_own" on public.keyword_queue
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
