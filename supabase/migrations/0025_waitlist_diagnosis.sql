-- 진단(시뮬레이터) 응답을 사전등록과 함께 보관. 같은 waitlist 테이블에 가산(nullable).
-- 기존 사전등록 흐름은 그대로 동작(이 컬럼은 진단 경유 신청에서만 채워짐).
alter table public.waitlist
  add column if not exists diagnosis jsonb;
