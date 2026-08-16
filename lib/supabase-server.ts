import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Supabase 환경변수가 설정되어 있는지 확인 (키 없이도 랜딩이 렌더되도록 가드용). */
export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * 서버 컴포넌트 · 라우트 핸들러용 Supabase 클라이언트.
 * Next 16의 async `cookies()` 패턴을 따른다.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // 서버 컴포넌트에서 호출되면 쿠키를 설정할 수 없다.
            // 세션 갱신은 middleware가 담당하므로 무시해도 안전하다.
          }
        },
      },
    },
  );
}

/**
 * 서비스 롤 키를 쓰는 관리자 클라이언트 (서버 전용).
 * RLS를 우회하므로 신뢰된 서버 로직에서만 사용한다 (예: 정기 청구 cron).
 */
export function createSupabaseAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
    },
  );
}
