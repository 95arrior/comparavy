-- 사전 등록(웨이트리스트) — 출시 전 관심 사용자 이메일 수집.
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text,                 -- 유입 경로(선택)
  created_at timestamptz not null default now()
);
-- RLS 켜고 정책 없음 → 서버(서비스롤)만 접근. 익명/유저 직접 읽기·쓰기 차단(API 경유만).
alter table public.waitlist enable row level security;
