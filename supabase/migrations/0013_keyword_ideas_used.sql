-- 글감 추천 사용량. 글 한도에 연동(글 1편당 3회) → 무료 평생 9회, 프로 월 90회.
-- 프로는 결제주기 리셋 시 함께 0으로 (rolloverIfNeeded), 무료는 누적(평생).
alter table public.users
  add column if not exists keyword_ideas_used integer not null default 0;
