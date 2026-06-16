-- PIVOT 6 후속: 영업시간 요일별 구조화. 기존 biz_hours(text)는 fallback으로 유지(회귀 방지).
-- 구조: { "mon": {"closed":false,"open":"09:00","close":"18:00","breakStart":"13:00","breakEnd":"14:00"}, "sun": {"closed":true}, ... }
alter table public.blog_profiles add column if not exists biz_hours_json jsonb;
