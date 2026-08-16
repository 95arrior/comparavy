-- AI 원본 복구용: 생성 시점 원본 본문 저장(절대 덮어쓰지 않음). 0004 이후 1회 실행.
alter table public.articles add column if not exists original_html text;
