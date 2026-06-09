-- 글마다 워드프레스 태그(3~5개)를 저장. 발행 시 WP 태그로 생성/연결된다.
alter table public.articles
  add column if not exists tags jsonb not null default '[]'::jsonb;
