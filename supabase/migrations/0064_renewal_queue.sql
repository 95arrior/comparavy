-- ★갱신 큐(2026-07-17 전략 회의) — 경제 개정 시즌에 걸린 오래된 발행 글을 갱신 후보로 등재.
--  선정은 크론(revision-scan)이 자동, 재발행은 유저 검토 후(라이브 글 자동 덮어쓰기 금지).
create table if not exists public.renewal_queue (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  user_id uuid not null,
  keyword text not null,
  title text,
  channel text,                            -- naver | wp
  season_key text not null,                -- 시즌:연도 인스턴스(예: tax_reform:2026)
  season_label text not null,
  status text not null default 'pending',  -- pending | done | dismissed
  created_at timestamptz not null default now(),
  unique (article_id, season_key)
);
create index if not exists renewal_queue_user_idx on public.renewal_queue (user_id, status, created_at desc);
alter table public.renewal_queue enable row level security;
