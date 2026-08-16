// 구글 서치콘솔 OAuth + API 헬퍼 (googleapis 패키지 없이 fetch로 직접 호출).
// 5-1: 연결(토큰 발급/갱신) + 속성(사이트) 목록까지. 데이터 조회(검색분석)는 5-2.
import { encryptSecret, decryptSecret } from "./crypto";
import { createSupabaseAdminClient } from "./supabase-server";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GSC_API = "https://www.googleapis.com/webmasters/v3";
// 읽기 전용 스코프 + 연결 계정 이메일 표시용(openid email은 민감 스코프 아님).
const SCOPE = "openid email https://www.googleapis.com/auth/webmasters.readonly";

export function gscConfigured(): boolean {
  return Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
}

export function gscRedirectUri(origin: string): string {
  return process.env.GSC_REDIRECT_URI || `${origin}/api/searchconsole/callback`;
}

export function gscAuthUrl(redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline", // refresh_token 발급
    prompt: "consent", // 매 연결마다 refresh_token을 확실히 받기
    include_granted_scopes: "true",
    state,
  });
  return `${GOOGLE_AUTH}?${p.toString()}`;
}

interface TokenResp {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

function emailFromIdToken(idToken?: string): string | null {
  if (!idToken) return null;
  try {
    const payload = idToken.split(".")[1];
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof json.email === "string" ? json.email : null;
  } catch {
    return null;
  }
}

export async function gscExchangeCode(code: string, redirectUri: string): Promise<TokenResp> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const r = await fetch(GOOGLE_TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  return r.json().catch(() => ({ error: "token_parse_error" }));
}

async function gscRefresh(refreshToken: string): Promise<TokenResp> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
    grant_type: "refresh_token",
  });
  const r = await fetch(GOOGLE_TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  return r.json().catch(() => ({ error: "token_parse_error" }));
}

/**
 * code 교환 결과를 DB에 저장(유저당 1행, 토큰 암호화). refresh_token은 재동의 시 없을 수 있으므로 있을 때만 갱신.
 * 반환: 저장에 성공했는지 + 연결 이메일.
 */
export async function gscStoreConnection(userId: string, tok: TokenResp): Promise<{ ok: boolean; email: string | null }> {
  if (!tok.access_token) return { ok: false, email: null };
  const admin = createSupabaseAdminClient();
  const email = emailFromIdToken(tok.id_token);
  const expiry = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();
  const row: Record<string, unknown> = {
    user_id: userId,
    access_token: encryptSecret(tok.access_token),
    token_expiry: expiry,
    scope: tok.scope ?? null,
    updated_at: new Date().toISOString(),
  };
  if (email) row.google_email = email;
  if (tok.refresh_token) row.refresh_token = encryptSecret(tok.refresh_token);
  const { error } = await admin.from("searchconsole_connections").upsert(row, { onConflict: "user_id" });
  return { ok: !error, email };
}

/** 저장된 연결에서 유효한 access token을 얻는다(만료 시 refresh로 갱신·저장). 없으면 null. */
export async function gscGetValidToken(userId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("searchconsole_connections").select("access_token,refresh_token,token_expiry").eq("user_id", userId).maybeSingle();
  if (!data?.refresh_token) return data?.access_token ? decryptSecret(data.access_token) : null;
  const now = Date.now();
  const exp = data.token_expiry ? new Date(data.token_expiry).getTime() : 0;
  if (data.access_token && exp - 60_000 > now) return decryptSecret(data.access_token);
  // 만료 → refresh
  const refreshed = await gscRefresh(decryptSecret(data.refresh_token));
  if (!refreshed.access_token) return null;
  await admin
    .from("searchconsole_connections")
    .update({ access_token: encryptSecret(refreshed.access_token), token_expiry: new Date(now + (refreshed.expires_in ?? 3600) * 1000).toISOString(), updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  return refreshed.access_token;
}

export interface GscSite {
  siteUrl: string;
  permissionLevel: string;
}

/** 연결 계정이 접근 가능한 서치콘솔 속성 목록. (권한 없는 siteUnverifiedUser는 제외) */
export async function gscListSites(accessToken: string): Promise<GscSite[]> {
  const r = await fetch(`${GSC_API}/sites`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!r.ok) return [];
  const d = await r.json().catch(() => ({}));
  const entries: GscSite[] = Array.isArray(d.siteEntry) ? d.siteEntry : [];
  return entries.filter((s) => s.permissionLevel && s.permissionLevel !== "siteUnverifiedUser");
}

export interface GscRow {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/** 검색분석 쿼리(searchanalytics.query). siteUrl은 인코딩 처리. 실패 시 error 반환. */
export async function gscSearchAnalytics(
  accessToken: string,
  siteUrl: string,
  body: Record<string, unknown>,
): Promise<{ rows: GscRow[]; error?: string }> {
  const r = await fetch(`${GSC_API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    return { rows: [], error: d?.error?.message || `검색분석 호출 실패 (${r.status})` };
  }
  const d = await r.json().catch(() => ({}));
  return { rows: Array.isArray(d.rows) ? d.rows : [] };
}
