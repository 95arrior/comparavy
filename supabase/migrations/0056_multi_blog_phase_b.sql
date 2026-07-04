-- ★멀티 블로그 Phase B — 다중 행 허용 + '활성 블로그 1개' 강제(기존 .single() 코드 전부 안전).
alter table public.blog_profiles add column if not exists is_active boolean not null default true;
alter table public.blog_profiles add column if not exists blog_name_internal text; -- 스위처 표시용(없으면 blog_name)
-- 유저당 1행 제약 해제 → 활성 1개만 부분 유니크로 강제
alter table public.blog_profiles drop constraint if exists blog_profiles_user_unique;
drop index if exists blog_profiles_active_one;
create unique index blog_profiles_active_one on public.blog_profiles (user_id) where is_active;
-- 검증: 활성 블로그가 정확히 계정당 1개인가(위반 0 기대)
select count(*) as users_with_multi_active from (
  select user_id from public.blog_profiles where is_active group by user_id having count(*) > 1
) t;
