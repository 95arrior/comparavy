-- ★긴급: 0057의 유니크가 표현식 인덱스라 upsert(onConflict)가 매칭 불가 → 체크인 저장 전면 실패.
--  컬럼 유니크 제약으로 교체(NULL은 Postgres상 중복 허용되나 앱이 항상 blog_id를 채우므로 무해).
drop index if exists checkins_user_blog_day;
alter table public.checkins drop constraint if exists checkins_user_blog_day_key;
alter table public.checkins add constraint checkins_user_blog_day_key unique (user_id, blog_id, day);
select 'ok' as done;
