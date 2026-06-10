-- 콘텐츠 캘린더용: 글의 발행/예약 일시. 예약(future)=예약 시각, 발행(publish)=발행 시각.
alter table articles add column if not exists publish_at timestamptz;
create index if not exists articles_publish_at_idx on public.articles (user_id, publish_at);
