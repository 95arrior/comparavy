-- 연구소 '살아있는 데이터' 공용 캐시. 카테고리별(대분류|세부) 하루 1회만 네이버 호출 → 여기 저장.
-- 유저 무관 공용 데이터(트렌드/주목 키워드)라 사용자가 늘어도 API 호출 안 늚 = 한도 안전.
create table if not exists public.category_insights (
  cache_key text primary key,        -- "{category}|{sub}"
  category text not null,
  sub text,
  keywords jsonb not null default '[]'::jsonb,  -- 주목 키워드 [{keyword,mobile,compIdx,rising}]
  trend jsonb,                                   -- 데이터랩 추이 {series,items}
  updated_at timestamptz not null default now()
);

-- RLS 켜고 정책 없음 → 서버(서비스롤)만 접근(공용 캐시). 유저 직접 접근 차단.
alter table public.category_insights enable row level security;
