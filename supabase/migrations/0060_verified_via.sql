-- 발행 확정 경로 구분(2026-07-08) — 직접 확정(direct: 위저드·주소 입력) vs RSS 자동 회수(rss: 실제 발행 시각과 차이 가능)
-- 표시 원칙: direct="발행", rss/null="확인" — 어긋날 수 있는 시각을 '발행'으로 단정하지 않는다(가짜 정밀함 금지)
alter table articles add column if not exists verified_via text;
