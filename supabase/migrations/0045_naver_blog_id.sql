-- 네이버 블로그 아이디 — 기기(localStorage)가 아니라 계정(프로필)에 저장. 모바일·웹 동기화.
alter table public.blog_profiles add column if not exists naver_blog_id text;
