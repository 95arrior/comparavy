-- 스레드(Threads) 연동: OAuth 토큰·계정·교차발행 설정 저장.
alter table public.social_settings
  add column if not exists threads_user_id text,
  add column if not exists threads_access_token text,          -- 암호화 저장
  add column if not exists threads_token_expires_at timestamptz,
  add column if not exists threads_enabled boolean not null default false; -- 카드 발행 시 스레드도 함께
