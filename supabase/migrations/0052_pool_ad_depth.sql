-- 단가 축(Part B) — plAvgDepth(월평균 노출 광고수) = 광고주 경쟁 밀도. 원화 CPC의 프록시(같은 응답 필드 = 추가 호출 0).
-- 진짜 원화 입찰가는 검색광고 Estimate API(키워드당 추가 호출) — 필요 시 이 컬럼 옆에 avg_cpc로 확장.
alter table public.keyword_pool add column if not exists ad_depth integer;
