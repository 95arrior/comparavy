-- 무료 한도 초과 시 만드는 "티저(미리보기)" 글 표시용 컬럼.
-- locked = true 인 글은 상단만 보이고 하단은 블러 처리되며, 프로 결제 시 잠금 해제된다.
alter table articles add column if not exists locked boolean not null default false;

-- 잠긴 미리보기 조회/카운트 빠르게
create index if not exists idx_articles_user_locked on articles (user_id, locked);
