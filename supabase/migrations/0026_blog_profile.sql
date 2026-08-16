-- 블로그 프로필(온보딩 1회 저장): 이후 모든 글이 이 설정(주제·문체·유형·타겟)을 따른다.
-- 유저당 1행(MVP 단일 블로그). 발행 모드도 여기 보관(실제 cron 구동은 2-B).
create table if not exists public.blog_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  topic text not null,                       -- 주제/카테고리 (예: 강아지)
  tone text not null default 'friendly',     -- 친근한 존댓말/정중한 존댓말/전문가 톤 → friendly/professional/informative
  article_type text not null default 'howto',-- 정보형/가이드형 → 생성엔진 type
  target text,                               -- 타겟 독자 (예: 초보 견주)
  publish_mode text not null default 'manual', -- 'manual'(매일 1터치) | 'auto'(완전 자동)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: 본인 행만 (articles와 동일 패턴)
alter table public.blog_profiles enable row level security;
drop policy if exists "blog_profiles_own" on public.blog_profiles;
create policy "blog_profiles_own" on public.blog_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
