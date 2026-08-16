-- P1-C 콘텐츠 차별화: 구조 다양성 원장 + SimHash(기록용)
-- Supabase SQL 에디터에서 1회 실행하세요. (0002 이후)

-- 글마다 SimHash 저장 (근접 중복 모니터링용 — 재생성 트리거 아님)
alter table public.articles add column if not exists simhash text;

-- 사용자·키워드별 사용한 구조 시그니처 기록 → 다음 생성 때 다른 구조 강제
create table if not exists public.article_patterns (
  user_id uuid not null references auth.users (id) on delete cascade,
  keyword_norm text not null,
  signature text not null,
  used_count int not null default 1,
  last_used_at timestamptz not null default now(),
  primary key (user_id, keyword_norm, signature)
);

alter table public.article_patterns enable row level security;

create policy "patterns self" on public.article_patterns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
