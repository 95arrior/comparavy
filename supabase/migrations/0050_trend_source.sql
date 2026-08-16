-- 씨앗 출처 구분(news=뉴스, season=시즌 캘린더, discover=자동완성 발굴) — momentum 배지 분리용
alter table public.trend_topics add column if not exists source text;
