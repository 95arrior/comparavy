-- 글별 AI 이미지 URL 저장 — 기기(localStorage)가 아니라 계정에. 웹·모바일 동기화(재과금 방지).
-- 형태: {"0":"https://...","1":"https://..."} (사진 자리 인덱스 → 스토리지 URL)
alter table public.articles add column if not exists images jsonb;
