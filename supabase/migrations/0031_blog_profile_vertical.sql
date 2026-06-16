-- 업종(vertical) 레이어: 블로그가 전문 업종 맥락을 갖도록 한다.
-- 이후 단계에서 업종별 프롬프트 분기·금칙어 필터·시드 키워드가 이 값을 참조한다.
-- enum 후보: medical(병의원) | academy(학원) | professional(법무·세무·노무 등 전문직) | b2b(B2B 서비스) | general(기타·기본값)
-- DB는 text로 두고 값 검증은 앱(lib/blogProfile.ts)에서 — 기존 tone/article_type와 동일 패턴(CHECK 미사용).
alter table public.blog_profiles
  add column if not exists vertical text not null default 'general';
