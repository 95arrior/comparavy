-- 대표 이미지(선택) 컬럼. Supabase SQL 에디터에서 1회 실행 (0003 이후).
alter table public.articles add column if not exists featured_image text;
