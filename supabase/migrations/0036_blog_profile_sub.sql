-- Stage 1-B: 세부(sub) 분류. 업종(vertical) 아래 세부를 골라 키워드 풀을 (업종·세부) 단위로 좁힌다.
-- nullable — 기존 프로필 안 깨지게(미선택/레거시 허용). '직접 입력' 값도 이 컬럼에 자유텍스트로 저장.
alter table public.blog_profiles add column if not exists sub_category text;
