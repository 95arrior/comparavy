-- 월 예산 알림 중복 방지: 이미 알림 보낸 달(YYYY-MM)을 기록.
alter table public.ai_health
  add column if not exists budget_alert_month text;
