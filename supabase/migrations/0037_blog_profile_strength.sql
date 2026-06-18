-- 운영자 강점·특징(선택) — 글 마무리에서 업장으로 자연스럽게 연결할 때만 사용한다.
-- 과장 표현이 섞여 들어와도 글 생성 단계에서 사실적으로 순화/배제한다(광고법 가드).
alter table public.blog_profiles add column if not exists biz_strength text;
