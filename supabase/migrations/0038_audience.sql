-- 검색 심리 글감 1단계: 대상(audience) 축.
-- 사장이 '누구를 가르치나'를 다중 선택으로 저장(jsonb 배열). 글감을 그 대상으로 거른다.
alter table public.blog_profiles add column if not exists audience jsonb not null default '[]'::jsonb;

-- 키워드 풀에도 대상 컬럼(정밀 분류는 stage 2에서 채움). 지금은 비어 있어 라우트가 텍스트 휴리스틱으로 보완.
alter table public.keyword_pool add column if not exists audience text;
create index if not exists keyword_pool_audience_idx on public.keyword_pool (vertical, audience);
