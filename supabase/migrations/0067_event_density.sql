-- ★사건 밀도 계측(2026-08-07) — 사건 레인의 컷(6시간 N건·매체 M개)을 감이 아니라 분포로 정하려고 쌓는다.
--  며칠 쌓인 뒤 /api/health/event-density가 분포를 요약한다. 발행 파이프는 아직 아무것도 안 바꾼다.
create table if not exists event_density (
  id bigint generated always as identity primary key,
  measured_at timestamptz not null default now(),
  probe text not null,           -- 온도계 검색어(부동산 대책 등)
  grp text not null,             -- 소재 묶음(부동산/증시/…)
  cnt_1h int not null,
  cnt_6h int not null,
  outlets_6h int not null,       -- 서로 다른 매체 수(한 매체 단독 = 사건 아님)
  uniq_6h int not null,          -- 제목 중복 걷은 수(재전송 거품 제거)
  top_titles jsonb not null default '[]'
);

create index if not exists idx_event_density_probe_time on event_density (probe, measured_at desc);

-- 서비스 롤만 쓴다(크론 전용). RLS는 켜되 정책은 두지 않는다 — anon 접근 차단.
alter table event_density enable row level security;
