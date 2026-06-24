-- 글 발행 채널(wp|naver) — 글 단위 저장(타입 추론 대신 정확). 기본 wp.
alter table public.articles add column if not exists channel text default 'wp';
