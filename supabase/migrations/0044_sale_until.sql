-- 24시간 한정 할인 — 계정 단위 1회성(서버 강제).
-- null = 아직 시작 안 됨. 값 있음 = 시작됨(만료돼도 재시작 없음 — '한정'의 신뢰).
alter table public.users add column if not exists sale_until timestamptz;
