-- PIVOT 6: 업체 정보(선택). 입력하면 생성된 글 하단에 NAP 박스로 자동 삽입(로컬 SEO).
-- 모두 nullable — 비어 있으면 박스 미삽입(general 등 영향 0).
alter table public.blog_profiles add column if not exists biz_name text;     -- 상호명
alter table public.blog_profiles add column if not exists biz_address text;   -- 주소
alter table public.blog_profiles add column if not exists biz_phone text;     -- 전화번호
alter table public.blog_profiles add column if not exists biz_hours text;     -- 영업시간
