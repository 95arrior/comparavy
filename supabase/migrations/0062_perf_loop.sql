-- ★성과 루프(FF_PERF_LOOP) — additive only(스펙 §0-4: 추가만, 삭제·변경 금지).
--  RLS는 켜되 정책 없음 = 서비스롤 전용(keyword_pool 패턴).

-- 발행 시점 선별 맥락(카드가 실어온 훅·씨앗·점수) — 생성 라우트가 기록
alter table public.articles add column if not exists selection_meta jsonb;

-- 발행 성공(검증 통과) 스냅샷 — "어떤 선택이 이겼나"의 원장
create table if not exists public.post_performance (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null unique,
  user_id uuid not null,
  blog_id uuid,
  url text,
  keyword text not null,
  title text,
  published_at timestamptz,
  species text,            -- trend | evergreen
  seed_source text,        -- news | season | discover | applyhome | gov24 | bizinfo | pool
  hook_type text,          -- 훅 패턴 9종 key
  structure_id text,       -- 구조 조합 id
  score_breakdown jsonb,   -- 선별 당시 점수 전 항목
  vol int,
  blog_total int,
  stars int,
  created_at timestamptz not null default now()
);
create index if not exists post_perf_user_idx on public.post_performance (user_id, published_at desc);
create index if not exists post_perf_pub_idx on public.post_performance (published_at desc);
alter table public.post_performance enable row level security;

-- 순위 스냅샷 — D+1/3/7/14 × 영역별
create table if not exists public.rank_snapshots (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null,
  day_offset int not null,           -- 1 | 3 | 7 | 14
  area text not null,                -- blog_tab | integrated
  rank int,                          -- null = 미노출/불명
  status text not null default 'ok', -- ok | not_found | unknown
  checked_at timestamptz not null default now(),
  unique (article_id, day_offset, area)
);
create index if not exists rank_snap_article_idx on public.rank_snapshots (article_id, day_offset);
alter table public.rank_snapshots enable row level security;

-- 유입 키워드(크리에이터 어드바이저 임포트)
create table if not exists public.inflow_keywords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  blog_id uuid,
  date date not null,
  keyword text not null,
  inflow int not null default 0,
  pool_candidate boolean not null default false, -- keyword_pool 미등재 = 실측 유입 검증됨(자동 편입 금지, 후보만)
  created_at timestamptz not null default now(),
  unique (user_id, date, keyword)
);
alter table public.inflow_keywords enable row level security;

-- 일별 수익(애드포스트 임포트) — 글별 아님(애드포스트가 일별 총액만 제공)
create table if not exists public.revenue_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  blog_id uuid,
  date date not null,
  revenue_krw numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
alter table public.revenue_daily enable row level security;
