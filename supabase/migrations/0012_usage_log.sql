-- Anthropic API 실제 토큰 사용량 기록 (관리자 비용/사용량 집계용)
create table if not exists public.usage_log (
  id bigint generated always as identity primary key,
  user_id uuid,
  model text not null,
  kind text not null,                 -- generate | keyword_guard | tag_suggest | keyword_ideas
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists usage_log_created_idx on public.usage_log (created_at);
-- RLS 켜고 정책 없음 → 서비스롤(관리자)만 접근, 일반 사용자는 읽기 불가
alter table public.usage_log enable row level security;
