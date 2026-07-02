-- 0043: 크레딧 시스템 — 플랜(월 N편)→크레딧(글 생성마다 차감) 전환.
-- ★적자 방지 원칙: 차감은 '선차감·원자적'(잔액 부족이면 생성 자체가 시작 안 됨),
--   충전은 ref 기반 멱등(토스 웹훅 재전송·중복 환불로 크레딧이 이중 지급되지 않음).

-- 1) 잔액 컬럼 (신규 가입 기본 0 — 무료 크레딧 없음, 구경만 무료)
alter table public.users add column if not exists credits integer not null default 0;

-- 2) 원장(append-only) — 모든 증감 기록. 감사·CS·이상탐지의 단일 근거.
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,              -- +충전 / -차감
  balance_after integer not null,       -- 처리 후 잔액
  reason text not null,                 -- 'purchase' | 'generate' | 'refund_generate' | 'grant' | 'admin'
  ref text,                             -- 주문번호(토스 orderId)·환불 기준 id 등
  created_at timestamptz not null default now()
);
create index if not exists credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);

-- 멱등 가드: 같은 (reason, ref) 충전·환불은 1회만. (차감 'generate'는 ref 없이 여러 번 가능)
create unique index if not exists credit_ledger_idem_idx
  on public.credit_ledger (user_id, reason, ref)
  where ref is not null and reason in ('purchase', 'refund_generate', 'grant');

alter table public.credit_ledger enable row level security;
-- 본인 원장 읽기만 허용(내역 화면용). 쓰기는 아래 RPC(서비스롤)로만.
drop policy if exists "own_ledger_select" on public.credit_ledger;
create policy "own_ledger_select" on public.credit_ledger for select using (auth.uid() = user_id);

-- 3) 원자적 차감 — 잔액 >= amount 일 때만 차감(조건부 UPDATE). 부족하면 -1 반환.
create or replace function public.spend_credits(p_user_id uuid, p_amount integer, p_reason text, p_ref text default null)
returns integer
language plpgsql security definer set search_path = public
as $$
declare v_balance integer;
begin
  if p_amount is null or p_amount <= 0 then return -1; end if;
  update public.users set credits = credits - p_amount
    where id = p_user_id and credits >= p_amount
    returning credits into v_balance;
  if v_balance is null then return -1; end if; -- 잔액 부족 or 유저 없음
  insert into public.credit_ledger (user_id, amount, balance_after, reason, ref)
    values (p_user_id, -p_amount, v_balance, p_reason, p_ref);
  return v_balance;
end $$;

-- 4) 원자적 충전/환불 — (reason, ref) 멱등: 이미 처리된 건이면 증가 없이 현재 잔액 반환.
create or replace function public.add_credits(p_user_id uuid, p_amount integer, p_reason text, p_ref text default null)
returns integer
language plpgsql security definer set search_path = public
as $$
declare v_balance integer;
begin
  if p_amount is null or p_amount <= 0 then return -1; end if;
  update public.users set credits = credits + p_amount
    where id = p_user_id
    returning credits into v_balance;
  if v_balance is null then return -1; end if;
  begin
    insert into public.credit_ledger (user_id, amount, balance_after, reason, ref)
      values (p_user_id, p_amount, v_balance, p_reason, p_ref);
  exception when unique_violation then
    -- 이미 처리된 충전(웹훅 재전송 등) → 방금 올린 잔액을 되돌리고 종료(이중 지급 차단)
    update public.users set credits = credits - p_amount where id = p_user_id
      returning credits into v_balance;
  end;
  return v_balance;
end $$;

-- 5) RPC는 서비스롤 전용 — 클라이언트가 직접 못 부름
revoke all on function public.spend_credits(uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public.add_credits(uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.spend_credits(uuid, integer, text, text) to service_role;
grant execute on function public.add_credits(uuid, integer, text, text) to service_role;
