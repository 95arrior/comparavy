-- 글의 워드프레스 카테고리(분류) 이름을 저장. 발행 시 WP에서 찾거나 생성해 연결한다.
alter table public.articles
  add column if not exists category text;
