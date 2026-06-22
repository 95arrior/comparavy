// 구글 애즈 API — 키워드 아이디어(KeywordPlanIdeaService.generateKeywordIdeas).
// refresh token → access token 교환 후 REST 호출. 네이버 수집기와 동일한 PoolKeyword 형태로 반환.
//
// 필요한 env(6): GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET,
//   GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_LOGIN_CUSTOMER_ID, GOOGLE_ADS_CUSTOMER_ID.
//   (선택) GOOGLE_ADS_API_VERSION — 기본 v18. 버전 안 맞아 404면 이 값만 바꾸면 됨.

import type { PoolKeyword } from "./poolCollect";

// API 버전 — env로 고정하거나, 없으면 후보를 순서대로 시도해 되는 버전을 찾아 캐시(404=버전 불일치).
const VERSION_CANDIDATES = ["v21", "v20", "v19", "v18", "v17"];
let resolvedVersion: string | null = null;
const KOREA_GEO = "geoTargetConstants/2410"; // 대한민국
const KOREAN_LANG = "languageConstants/1012"; // 한국어

function digits(s: string | undefined): string {
  return String(s ?? "").replace(/[^0-9]/g, "");
}

export function googleAdsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
      process.env.GOOGLE_ADS_CLIENT_ID &&
      process.env.GOOGLE_ADS_CLIENT_SECRET &&
      process.env.GOOGLE_ADS_REFRESH_TOKEN &&
      process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID &&
      process.env.GOOGLE_ADS_CUSTOMER_ID,
  );
}

// access token 캐시(약 1시간 유효 → 만료 1분 전 갱신)
let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.exp) return cachedToken.token;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }).toString(),
  });
  const data = (await res.json()) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(`구글 OAuth 토큰 교환 실패: ${data.error ?? res.status} ${data.error_description ?? ""}`.trim());
  }
  cachedToken = { token: data.access_token, exp: Date.now() + (data.expires_in ?? 3600) * 1000 - 60_000 };
  return cachedToken.token;
}

const COMP_MAP: Record<string, string> = { LOW: "낮음", MEDIUM: "중간", HIGH: "높음" };

type IdeaResult = { text?: string; keywordIdeaMetrics?: { avgMonthlySearches?: string | number; competition?: string } };

/**
 * 시드의 구글 키워드 아이디어를 거둔다 → PoolKeyword[](keyword, 월검색량, 경쟁도).
 * 네이버 collectPoolKeywords와 호환되는 출력. (안전필터·정크필터는 호출 측에서 그대로 적용)
 */
async function callOnce(version: string, seed: string, token: string, loginId: string): Promise<{ status: number; text: string }> {
  const customerId = digits(process.env.GOOGLE_ADS_CUSTOMER_ID);
  const url = `https://googleads.googleapis.com/${version}/customers/${customerId}:generateKeywordIdeas`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
      "login-customer-id": loginId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      language: KOREAN_LANG,
      geoTargetConstants: [KOREA_GEO],
      keywordPlanNetwork: "GOOGLE_SEARCH",
      keywordSeed: { keywords: [seed] },
    }),
  });
  return { status: res.status, text: await res.text() };
}

// 원본 응답 1회 획득(버전 자동탐지 + login 폴백). status/text/version/login 반환.
async function fetchRawBody(seed: string): Promise<{ status: number; text: string; version: string; loginUsed: string; primary?: { login: string; status: number; text: string } }> {
  const token = await getAccessToken();
  const versions = process.env.GOOGLE_ADS_API_VERSION
    ? [process.env.GOOGLE_ADS_API_VERSION]
    : resolvedVersion
    ? [resolvedVersion]
    : VERSION_CANDIDATES;

  const customerId = digits(process.env.GOOGLE_ADS_CUSTOMER_ID);
  const loginEnv = digits(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) || customerId;

  let last = "";
  for (const v of versions) {
    let loginUsed = loginEnv;
    let r = await callOnce(v, seed, token, loginEnv);
    if (r.status === 404) { last = `v=${v} 404`; continue; }
    const primary = { login: loginEnv, status: r.status, text: r.text }; // 1차(MCC) 시도 원문 보존
    if (r.status === 403 && /USER_PERMISSION_DENIED/.test(r.text) && loginEnv !== customerId) {
      loginUsed = customerId;
      r = await callOnce(v, seed, token, customerId);
    }
    if (!process.env.GOOGLE_ADS_API_VERSION && r.status >= 200 && r.status < 300) resolvedVersion = v;
    return { status: r.status, text: r.text, version: v, loginUsed, primary };
  }
  throw new Error(`구글 애즈: 사용 가능한 API 버전을 못 찾음(${last}).`);
}

export async function fetchGoogleKeywordIdeas(seed: string): Promise<PoolKeyword[]> {
  const body = await fetchRawBody(seed);
  if (body.status < 200 || body.status >= 300) {
    throw new Error(`구글 애즈 키워드 호출 실패(${body.status}, ${body.version}): ${body.text.slice(0, 600)}`);
  }
  const json = JSON.parse(body.text) as { results?: IdeaResult[] };
  const out: PoolKeyword[] = [];
  for (const r of json.results ?? []) {
    const keyword = String(r.text ?? "").trim();
    if (!keyword) continue;
    const m = r.keywordIdeaMetrics;
    const vol = Number(m?.avgMonthlySearches ?? 0) || 0;
    out.push({ keyword, monthlyMobileQcCnt: vol, compIdx: COMP_MAP[String(m?.competition ?? "")] ?? "" });
  }
  out.sort((a, b) => b.monthlyMobileQcCnt - a.monthlyMobileQcCnt);
  return out;
}

// 디버그용 — 구글 원본 응답을 그대로(요약) 반환.
export async function fetchGoogleIdeasDebug(seed: string): Promise<unknown> {
  const body = await fetchRawBody(seed);
  let parsed: unknown = body.text;
  try { parsed = JSON.parse(body.text); } catch { /* keep text */ }
  const totalSize = (parsed as { totalSize?: unknown })?.totalSize;
  const results = (parsed as { results?: unknown[] })?.results;
  const loginEnv = digits(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
  const customerId = digits(process.env.GOOGLE_ADS_CUSTOMER_ID);
  // 1차(MCC) 시도 원문 — 403 등 진짜 에러가 여기 있음(폴백에 가려졌던 것)
  const primary = body.primary;
  let primaryRaw: unknown = primary?.text ?? null;
  try { if (primary) primaryRaw = JSON.parse(primary.text); } catch { /* keep text */ }
  const fellBack = Boolean(primary) && body.loginUsed !== primary!.login;
  return {
    version: body.version,
    loginEnv: loginEnv || "(미설정 → customerId로 폴백)", // 설정된 login-customer-id(=MCC여야 함)
    loginUsed: body.loginUsed, // 실제 결과를 낸 호출의 login-customer-id
    loginIsMcc: Boolean(loginEnv) && loginEnv !== customerId,
    customerId, // 대상 하위계정
    fellBackToSub: fellBack, // MCC 호출 실패로 하위계정 폴백했는지
    primaryLogin: primary?.login ?? null, // 1차 시도 login(=MCC)
    primaryStatus: primary?.status ?? null, // ★ MCC 호출 결과(403이면 권한/링크 문제)
    primaryRaw: primaryRaw, // ★ MCC 호출 에러 원문(진짜 원인)
    httpStatus: body.status, // 최종(폴백 포함) 상태
    totalSize: totalSize ?? null,
    resultCount: Array.isArray(results) ? results.length : null,
    raw: parsed,
  };
}
