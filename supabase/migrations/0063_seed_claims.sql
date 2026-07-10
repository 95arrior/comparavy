-- ★공유 씨앗 클레임(FF_SEED_CLAIM §5) — 같은 씨앗 동시 발행 유저 수 상한(문서 클러스터 유사성 방어). additive only.
create table if not exists public.seed_claims (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  keyword_norm text not null,      -- 공백 제거 정규화 키워드
  user_id uuid not null,
  created_at timestamptz not null default now(),
  unique (keyword_norm, user_id)   -- 같은 유저 중복 클레임 방지(카운트 왜곡 금지)
);
create index if not exists seed_claims_kw_idx on public.seed_claims (keyword_norm, created_at desc);
alter table public.seed_claims enable row level security;

-- 유저 고유 관점 한 줄(§5-2) — 본문에 자연스럽게 녹이는 개인화 축(선택 입력, 발행 비차단)
alter table public.blog_profiles add column if not exists my_angle text;
