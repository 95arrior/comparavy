-- AteFlo 초기 스키마
-- Supabase SQL 에디터에서 1회 실행하세요.

-- ─── users (플랜 · 사용량 · 빌링) ───────────────────────────
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free',
  articles_limit int not null default 3,
  articles_used int not null default 0,
  period_start timestamptz not null default now(),
  billing_key text,
  customer_key text,
  sub_status text,                 -- 'active' | 'canceled' | null
  next_billing_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

-- ─── articles (생성된 글) ───────────────────────────────────
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  keyword text,
  title text not null,
  meta_title text,
  meta_description text,
  body_html text not null,
  faq jsonb not null default '[]'::jsonb,
  char_count int not null default 0,
  status text not null default 'draft',  -- 'draft' | 'published' | 'future'
  wp_post_id bigint,
  wp_link text,
  created_at timestamptz not null default now()
);
create index if not exists articles_user_id_idx on public.articles (user_id, created_at desc);

-- ─── wordpress_connections (사이트당 1개) ───────────────────
create table if not exists public.wordpress_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  site_url text not null,
  username text not null,
  app_password text not null,
  created_at timestamptz not null default now()
);

-- ─── RLS ────────────────────────────────────────────────────
alter table public.users enable row level security;
alter table public.articles enable row level security;
alter table public.wordpress_connections enable row level security;

create policy "users self" on public.users
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "articles self" on public.articles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "wp self" on public.wordpress_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── 신규 가입 시 users 행 자동 생성 ───────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
