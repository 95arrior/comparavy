-- 스레드 전용 글(글 중심·해시태그 X·더 알찬 본문) 저장. IG 캡션과 별개.
alter table public.social_posts add column if not exists threads_text text;
