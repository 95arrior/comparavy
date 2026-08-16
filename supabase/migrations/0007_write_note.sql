-- 글쓴이에게 보여줄 짧은 메모(검색 의도·구성 이유). 본문이 아니라 편집화면 FAQ 위에 표시된다.
alter table articles add column if not exists write_note text;
