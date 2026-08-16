-- 블로그 프로필 보강: 대분류(category)와 블로그 이름(blog_name).
-- topic은 그대로 '키워드 발굴 검색어'(=세부 또는 대분류)로 사용한다.
alter table public.blog_profiles add column if not exists category text;
alter table public.blog_profiles add column if not exists blog_name text;
