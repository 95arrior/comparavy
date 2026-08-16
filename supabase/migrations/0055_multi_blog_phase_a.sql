-- ★멀티 블로그 Phase A(비파괴) — 신원 준비 + backfill. 기존 데이터 무변경·무손실.
-- 전략: blog_profiles에 id(pk 승격)를 추가하되 unique(user_id)는 '유지' → 기존 .single() 코드 전부 안전.
--       멀티 행 허용(unique 해제)·스위처·중복잠금은 Phase B에서.
alter table public.blog_profiles add column if not exists id uuid not null default gen_random_uuid();
do $$ begin
  if exists (select 1 from pg_constraint where conname = 'blog_profiles_pkey'
             and conrelid = 'public.blog_profiles'::regclass
             and pg_get_constraintdef(oid) like '%(user_id)%') then
    alter table public.blog_profiles drop constraint blog_profiles_pkey;
    alter table public.blog_profiles add primary key (id);
    alter table public.blog_profiles add constraint blog_profiles_user_unique unique (user_id); -- Phase B에서 해제
  end if;
end $$;

-- 글·시리즈에 블로그 소속 — backfill(현재 계정=블로그 1:1이므로 그 유저의 프로필 id)
alter table public.articles add column if not exists blog_id uuid;
alter table public.user_series add column if not exists blog_id uuid;
update public.articles a set blog_id = p.id from public.blog_profiles p where a.user_id = p.user_id and a.blog_id is null;
update public.user_series s set blog_id = p.id from public.blog_profiles p where s.user_id = p.user_id and s.blog_id is null;

-- ★무손실 증명(실행 결과로 확인): 남은 미배정 = 프로필 없는 계정의 글뿐이어야 함(0 기대)
select
  (select count(*) from public.articles where blog_id is null and user_id in (select user_id from public.blog_profiles)) as articles_unassigned,
  (select count(*) from public.user_series where blog_id is null and user_id in (select user_id from public.blog_profiles)) as series_unassigned,
  (select count(*) from public.blog_profiles where id is null) as profiles_no_id;
