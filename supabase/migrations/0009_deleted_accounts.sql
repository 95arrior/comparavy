-- 무료 어뷰징 방지: 탈퇴한 이메일을 단방향 해시로만 보관(평문 미저장).
-- 같은 이메일이 재가입해도 무료를 다시 주지 않기 위함(무료는 이메일당 평생 1회).
-- 부정이용 방지 목적의 최소 정보이므로 영구 보관.
create table if not exists public.deleted_accounts (
  email_hash text primary key,
  deleted_at timestamptz not null default now()
);

-- RLS 활성화 + 정책 없음 = 일반 사용자 접근 불가(서비스롤 전용).
alter table public.deleted_accounts enable row level security;
