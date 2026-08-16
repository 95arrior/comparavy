-- 구글 서치콘솔 연결(유저당 1행). 5-1: OAuth로 사용자가 자기 구글 계정을 연결하고
-- 자기 워드프레스 사이트의 서치콘솔 속성을 선택해 저장한다. 데이터 조회는 5-2/5-3.
-- access_token / refresh_token 은 암호화 저장(lib/crypto.encryptSecret, WP_ENCRYPTION_KEY 재사용).
create table if not exists public.searchconsole_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  google_email text,                 -- 연결된 구글 계정(표시용)
  access_token text,                 -- 암호화된 액세스 토큰(단기, 만료 시 refresh로 갱신)
  refresh_token text,                -- 암호화된 리프레시 토큰(장기)
  token_expiry timestamptz,          -- 액세스 토큰 만료 시각
  scope text,                        -- 부여된 스코프
  selected_site text,                -- 선택한 서치콘솔 속성(예: 'sc-domain:example.com' 또는 'https://example.com/')
  permission_level text,             -- 해당 속성 권한(siteOwner 등)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: 본인 행만 (articles·blog_profiles 등과 동일 패턴). 토큰 쓰기는 서버(서비스롤)가 수행.
alter table public.searchconsole_connections enable row level security;
drop policy if exists "searchconsole_own" on public.searchconsole_connections;
create policy "searchconsole_own" on public.searchconsole_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
