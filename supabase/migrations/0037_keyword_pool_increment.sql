-- Stage 2-B: 키워드로 실제 글을 쓰면 times_assigned +1 (균등 분산용).
-- 원자적 증가 — 동시 작성에도 lost update 없이 카운트. 서비스롤(generate 라우트)에서 호출.
create or replace function public.increment_keyword_assigned(p_vertical text, p_keyword text)
returns void
language sql
as $$
  update public.keyword_pool
  set times_assigned = times_assigned + 1,
      updated_at = now()
  where vertical = p_vertical and keyword = p_keyword;
$$;
