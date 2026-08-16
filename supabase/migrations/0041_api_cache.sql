-- 외부 호출(네이버·서치콘솔·AI) 결과 캐싱 — 유저별 1일 캐싱으로 호출 평탄화(비용·차단·쿼터 방어).
-- 서비스롤(admin)만 접근. RLS 켜고 정책 없음 = 일반 유저는 접근 불가.
create table if not exists public.api_cache (
  key text primary key,
  value jsonb,
  expires_at timestamptz,
  updated_at timestamptz default now()
);

create index if not exists api_cache_expires_idx on public.api_cache (expires_at);

alter table public.api_cache enable row level security;
