-- 행동 창(2026-07-08 유저 승인: 청약홈 수확기) — 공고형 씨앗의 접수 시작/마감. 카드 D-N 뱃지·만료의 원천.
alter table trend_topics add column if not exists action_start date;
alter table trend_topics add column if not exists action_end date;
