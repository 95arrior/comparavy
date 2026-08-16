-- RSS 발행 검증(Part 2) — 상태: draft→copied→pending_verify→verified→deleted. 게이지는 verified만.
-- 기존 자기신고(published)는 verified_legacy로 '취급'(값 변경 없이 카운트 로직에서 동급 — 자동 소급 삭제 금지).
alter table public.articles add column if not exists naver_url text;
alter table public.articles add column if not exists verify_attempts integer not null default 0;
alter table public.articles add column if not exists claimed_at timestamptz;
alter table public.articles add column if not exists verified_at timestamptz;
alter table public.blog_profiles add column if not exists naver_blog_id text;
create index if not exists articles_pending_verify_idx on public.articles (status, claimed_at) where status = 'pending_verify';
