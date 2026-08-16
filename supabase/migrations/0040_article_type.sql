-- 글 유형: 'promo'(홍보용 — 마지막에 업장 자연 연결) | 'info'(정보성 — 순수 정보, 업장 언급 X)
-- 정보성 글은 편집화면 '섹션 추가 추천'도 숨긴다.
alter table articles add column if not exists article_type text;
