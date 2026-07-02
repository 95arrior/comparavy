-- 색인 상태를 계정(DB)에 저장 — 크론이 하루 1번 검사해 기록, 화면은 저장값만 읽음(네이버 API 쿼터 90%↓).
alter table public.articles add column if not exists indexed_status text; -- 'indexed' | 'pending' | 'unknown'
alter table public.articles add column if not exists indexed_at timestamptz;
create index if not exists articles_index_scan_idx on public.articles (status, indexed_at) where status = 'published';
