-- 글감 추천 기반(Stage 1): 업종 시드로 네이버 발굴한 황금 키워드를 업종별로 대량 적재하는 공용 풀.
-- 유저 무관(서버 서비스롤만 접근). times_assigned로 Stage 3에서 1만 사용자에게 안 겹치게 분산한다.
create table if not exists public.keyword_pool (
  id uuid primary key default gen_random_uuid(),
  vertical text not null,                  -- medical / academy / professional / general
  sub text,                                -- 세부 분류(치과/영어/세무사/카페 등 · '직접입력' 자유텍스트 포함)
  keyword text not null,
  monthly_searches int,                    -- 월 모바일 검색량(monthlyMobileQcCnt)
  competition text,                        -- 경쟁도(낮음/중간/높음)
  estimated boolean not null default false,-- 검색량 추정값 여부
  seed text,                               -- 어느 업종 시드에서 나왔는지(추적)
  source text not null default 'naver',    -- 데이터 출처(나중에 'google'로 교체)
  times_assigned int not null default 0,   -- 분산/중복방지(Stage 3에서 사용)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vertical, sub, keyword)          -- (업종·세부) 단위 키워드 중복 제거 = 풀 품질
);

-- 추천 시 '(업종·세부)별 적게 쓰인 것 + 검색량 높은 것' 우선 조회용
create index if not exists keyword_pool_pick_idx on public.keyword_pool (vertical, sub, times_assigned, monthly_searches desc);

-- RLS 켜고 정책 없음 → 서버(서비스롤)만 접근(공용 풀, category_insights와 동일 패턴)
alter table public.keyword_pool enable row level security;
