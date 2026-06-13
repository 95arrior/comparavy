-- SNS 자동 발행: '발행 주기(interval)' 대신 '하루 발행 수'로 전환.
-- 정한 개수만큼 시작 시각부터 하루에 고르게 분산 발행한다. (기본 2개)
alter table public.social_settings
  add column if not exists posts_per_day int not null default 2;
