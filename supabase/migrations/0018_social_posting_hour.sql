-- SNS 자동 발행 시각(KST 기준 시) — 이 시각에 맞춰 게시. 주기와 함께 슬롯 계산.
alter table public.social_settings add column if not exists posting_hour int not null default 9;
