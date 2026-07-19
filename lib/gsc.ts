// ★구글 서치콘솔 성과 루프(2026-07-19 유저 승인 — 백로그 '색인 잡히는 시점' 트리거 충족).
//  서비스 계정 JWT를 직접 서명(RS256, node crypto) — 새 패키지 0 원칙. 스코프는 읽기 전용.
//  필요 env: GOOGLE_SA_EMAIL, GOOGLE_SA_PRIVATE_KEY(개행은 \n 이스케이프 허용), GSC_SITE_URL(도메인형: sc-domain:pigtong.com).
import crypto from "node:crypto";

const b64url = (b: Buffer | string): string =>
  (Buffer.isBuffer(b) ? b : Buffer.from(b)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function hasGscEnv(): boolean {
  return Boolean(process.env.GOOGLE_SA_EMAIL && process.env.GOOGLE_SA_PRIVATE_KEY && process.env.GSC_SITE_URL);
}

async function gscToken(): Promise<string> {
  const email = process.env.GOOGLE_SA_EMAIL!;
  const key = String(process.env.GOOGLE_SA_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  }));
  const input = `${header}.${claims}`;
  const sig = b64url(crypto.createSign("RSA-SHA256").update(input).sign(key));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${input}.${sig}`,
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
  if (!res.ok || !data.access_token) throw new Error(`GSC 토큰 실패: ${data.error_description ?? res.status}`);
  return data.access_token;
}

export interface GscRow { date: string; page: string; query: string; clicks: number; impressions: number; position: number }

/** 검색 실적(날짜×페이지×쿼리) — GSC 데이터는 2~3일 후행하므로 넉넉한 기간으로 호출한다. */
export async function gscQuery(startDate: string, endDate: string): Promise<GscRow[]> {
  const site = process.env.GSC_SITE_URL!;
  const token = await gscToken();
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ startDate, endDate, dimensions: ["date", "page", "query"], rowLimit: 5000 }),
    signal: AbortSignal.timeout(20_000),
  });
  const data = (await res.json().catch(() => ({}))) as { rows?: { keys: string[]; clicks: number; impressions: number; position: number }[]; error?: { message?: string } };
  if (!res.ok) throw new Error(`GSC 조회 실패: ${data.error?.message ?? res.status}`);
  return (data.rows ?? []).map((r) => ({
    date: r.keys[0]!, page: r.keys[1]!, query: r.keys[2]!,
    clicks: r.clicks ?? 0, impressions: r.impressions ?? 0, position: r.position ?? 0,
  }));
}

/** 페이지 URL → 글 매칭용 슬러그 정규화: "https://pigtong.com/정기예금특판/" → "정기예금특판" */
export function gscPageSlug(page: string): string {
  try {
    const path = decodeURIComponent(new URL(page).pathname);
    return path.replace(/\/+$/, "").split("/").pop()?.replace(/\s+/g, "").toLowerCase() ?? "";
  } catch { return ""; }
}
