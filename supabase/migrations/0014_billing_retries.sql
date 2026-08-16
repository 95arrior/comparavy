-- 정기결제 실패 시 즉시 강등하지 않고 유예기간 동안 재시도(dunning)하기 위한 횟수 카운터.
-- 결제 성공/강등 시 0으로 초기화한다.
alter table users add column if not exists billing_retries int not null default 0;
