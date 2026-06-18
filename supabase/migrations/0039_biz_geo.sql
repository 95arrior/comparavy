-- 업체 주소 정밀화: 도로명(biz_address) + 상세주소(biz_detail_address) + 좌표(지도 핀용).
-- 다음 우편번호 검색으로 도로명 자동 입력, 상세주소는 직접 입력, 좌표는 카카오 지오코딩으로 변환 저장.
alter table public.blog_profiles add column if not exists biz_detail_address text;
alter table public.blog_profiles add column if not exists biz_lat double precision;
alter table public.blog_profiles add column if not exists biz_lng double precision;
