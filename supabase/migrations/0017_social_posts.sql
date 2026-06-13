-- SNS(인스타) 자동 발행 대기열 + 자동발행 설정.
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'image',     -- image | reel | carousel
  media_urls jsonb not null default '[]'::jsonb,  -- 공개 URL 배열
  caption text not null default '',
  status text not null default 'queued',   -- queued | published | failed
  ig_media_id text,
  error text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.social_posts enable row level security; -- 서비스롤(서버)만 접근

create table if not exists public.social_settings (
  id int primary key default 1,
  auto_enabled boolean not null default false,  -- 자동발행 on/off
  interval_hours int not null default 24,       -- 발행 주기(시간)
  last_published_at timestamptz
);
alter table public.social_settings enable row level security;
insert into public.social_settings (id) values (1) on conflict (id) do nothing;
