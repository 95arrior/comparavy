-- 무료 미리보기(티저)를 이미 썼는지 영구 표시.
-- 글이 30일 보관 후 자동삭제돼도, 이 플래그는 남아 티저 재생성(무한 무료생성)을 막는다.
alter table users add column if not exists teaser_used boolean not null default false;
