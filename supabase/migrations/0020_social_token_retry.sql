-- SNS 안정성: 인스타 토큰 자동 갱신 저장 + 발행 실패 재시도 카운트.
-- 토큰을 DB에 보관하면 cron이 60일마다 갱신해 발행이 끊기지 않는다.
alter table public.social_settings
  add column if not exists ig_access_token text,
  add column if not exists ig_token_expires_at timestamptz,
  add column if not exists ig_token_refreshed_at timestamptz;

-- 발행 실패 시 재시도 횟수(3회까지 자동 재시도 후 failed 확정)
alter table public.social_posts
  add column if not exists attempts int not null default 0;
