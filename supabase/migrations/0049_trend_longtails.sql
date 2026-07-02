-- 씨앗별 자동완성 롱테일 저장 — 검색자가 실제로 치는 실익 키워드(뉴스 티 제거).
-- 형태: [{"kw":"고유가지원금 신청방법","blogTotal":1200}, ...] (blogTotal=gap, null이면 예산 초과로 미검사)
alter table public.trend_topics add column if not exists longtails jsonb;
