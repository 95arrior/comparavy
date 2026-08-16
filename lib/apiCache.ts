import { createSupabaseAdminClient } from "@/lib/supabase-server";

// 외부 호출(네이버·구글 서치콘솔·AI) 결과를 유저별로 잠깐 저장 → 호출을 '하루 1번'으로 평탄화.
// 목적: 1만 명 규모에서 비용·차단(네이버 IP)·GSC 쿼터 방어.
// 안전: api_cache 테이블이 없어도 try/catch로 '캐시 미스'처럼 동작 → 마이그레이션 적용 후 자동으로 캐싱 시작.

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin.from("api_cache").select("value, expires_at").eq("key", key).maybeSingle();
    if (!data) return null;
    if (data.expires_at && new Date(data.expires_at as string).getTime() < Date.now()) return null;
    return data.value as T;
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: unknown, ttlSec: number): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const expires_at = new Date(Date.now() + ttlSec * 1000).toISOString();
    await admin.from("api_cache").upsert({ key, value, expires_at, updated_at: new Date().toISOString() }, { onConflict: "key" });
  } catch {
    /* 캐시 저장 실패해도 본 기능엔 영향 없음 */
  }
}

export const TTL_DAY = 86400;
export const TTL_6H = 21600;
export const TTL_WEEK = 604800;
