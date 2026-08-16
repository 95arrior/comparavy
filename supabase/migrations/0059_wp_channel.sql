-- ★듀얼 채널 Phase 2 모듈 A — 블로그의 채널 정체성 + WP 연결의 블로그 귀속 + 자동 발행 설정.
-- 비파괴: 기존 네이버 블로그는 channel='naver' 기본값, 기존 WP 연결(user 단위)은 blog_id 백필 대상.
alter table public.blog_profiles add column if not exists channel text not null default 'naver'; -- 'naver' | 'wordpress'
alter table public.blog_profiles add column if not exists auto_publish text not null default 'off'; -- off | daily(완전자동) | review(아침 승인탭)
alter table public.blog_profiles add column if not exists auto_publish_hour int not null default 7; -- KST 생성·발행 시각

-- WP 연결: 유저당 1개(pk=user_id) → 블로그당 1개로 확장 준비. pk 전환은 실제 멀티 WP 수요 시(0055 패턴 재사용).
alter table public.wordpress_connections add column if not exists blog_id uuid;

-- 검증
select
  (select count(*) from public.blog_profiles where channel not in ('naver','wordpress')) as bad_channel,
  (select count(*) from public.blog_profiles where auto_publish not in ('off','daily','review')) as bad_auto;
