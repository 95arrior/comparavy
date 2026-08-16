-- 클로드(생성) 헬스: 크레딧 소진 등으로 글/카드 생성이 멈추면 관리자에게 보이게 한다.
create table if not exists public.ai_health (
  id int primary key default 1,
  ok boolean not null default true,
  last_error text,
  updated_at timestamptz not null default now()
);
insert into public.ai_health (id, ok) values (1, true) on conflict (id) do nothing;
alter table public.ai_health enable row level security;
-- 정책 없음 = service-role(관리자 서버)만 접근. 일반 사용자 접근 불가.

-- 카드뉴스 주제 기록(중복 방지용)
alter table public.social_posts add column if not exists topic text;
