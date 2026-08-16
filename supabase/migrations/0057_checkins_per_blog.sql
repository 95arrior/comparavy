-- ★체크인 블로그별 분리(실측: 블로그 2개 운영 시 방문자 합산 기록 → 급등 감지·배합 학습 오염)
alter table public.checkins add column if not exists blog_id uuid;
-- 기존 행 = 활성 블로그 소속으로 backfill
update public.checkins c set blog_id = p.id from public.blog_profiles p
  where c.user_id = p.user_id and p.is_active and c.blog_id is null;
-- 유니크 교체: (user, day) → (user, blog, day). 레거시 null은 coalesce로 계정 단위 취급
alter table public.checkins drop constraint if exists checkins_user_id_day_key;
drop index if exists checkins_user_blog_day;
create unique index checkins_user_blog_day on public.checkins (user_id, coalesce(blog_id, '00000000-0000-0000-0000-000000000000'::uuid), day);
select count(*) as rows_without_blog from public.checkins where blog_id is null;
