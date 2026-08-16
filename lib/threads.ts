// 스레드(Threads) API — graph.threads.net. OAuth 토큰 발급/갱신 + 글 발행(텍스트 + 이미지 1장).
const TH = "https://graph.threads.net";
const AUTH = "https://threads.net/oauth/authorize";

export function threadsConfigured(): boolean {
  return Boolean(process.env.THREADS_APP_ID && process.env.THREADS_APP_SECRET);
}

/** 사용자를 보낼 인증 URL (동의 → code 콜백). */
export function threadsAuthUrl(redirectUri: string): string {
  const p = new URLSearchParams({
    client_id: process.env.THREADS_APP_ID || "",
    redirect_uri: redirectUri,
    scope: "threads_basic,threads_content_publish",
    response_type: "code",
  });
  return `${AUTH}?${p.toString()}`;
}

/** code → 단기 토큰(+user_id) → 장기 토큰(60일)으로 교환. */
export async function exchangeThreadsCode(code: string, redirectUri: string): Promise<{ token: string; userId: string; expiresInSec: number }> {
  // 1) 단기 토큰
  const body = new URLSearchParams({
    client_id: process.env.THREADS_APP_ID || "",
    client_secret: process.env.THREADS_APP_SECRET || "",
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code: code.replace(/#_$/, ""),
  });
  const r1 = await fetch(`${TH}/oauth/access_token`, { method: "POST", body });
  const d1 = await r1.json();
  if (!r1.ok || !d1.access_token) throw new Error(`토큰 교환 실패: ${d1.error_message ?? d1.error?.message ?? JSON.stringify(d1)}`);
  const shortTok = d1.access_token as string;
  const userId = String(d1.user_id ?? "");

  // 2) 장기 토큰(60일)
  const r2 = await fetch(`${TH}/access_token?grant_type=th_exchange_token&client_secret=${encodeURIComponent(process.env.THREADS_APP_SECRET || "")}&access_token=${encodeURIComponent(shortTok)}`);
  const d2 = await r2.json();
  if (!r2.ok || !d2.access_token) throw new Error(`장기 토큰 교환 실패: ${d2.error?.message ?? JSON.stringify(d2)}`);
  return { token: d2.access_token as string, userId, expiresInSec: Number(d2.expires_in) || 5184000 };
}

/** 장기 토큰 갱신(60일 연장). */
export async function refreshThreadsToken(token: string): Promise<{ token: string; expiresInSec: number }> {
  const r = await fetch(`${TH}/refresh_access_token?grant_type=th_refresh_token&access_token=${encodeURIComponent(token)}`);
  const d = await r.json();
  if (!r.ok || !d.access_token) throw new Error(`스레드 토큰 갱신 실패: ${d.error?.message ?? JSON.stringify(d)}`);
  return { token: d.access_token as string, expiresInSec: Number(d.expires_in) || 5184000 };
}

export interface ThreadsCreds {
  userId: string;
  token: string;
}

/** 텍스트(+이미지 1장) 글 발행. B 방식: 캡션 텍스트 + 표지 이미지. */
export async function publishThreads(creds: ThreadsCreds, text: string, imageUrl?: string): Promise<string> {
  // 1) 컨테이너 생성
  const params: Record<string, string> = imageUrl
    ? { media_type: "IMAGE", image_url: imageUrl, text, access_token: creds.token }
    : { media_type: "TEXT", text, access_token: creds.token };
  const r1 = await fetch(`${TH}/${creds.userId}/threads`, { method: "POST", body: new URLSearchParams(params) });
  const d1 = await r1.json();
  if (!r1.ok || !d1.id) throw new Error(`스레드 컨테이너 실패: ${d1.error?.message ?? JSON.stringify(d1)}`);
  // 이미지 처리 잠깐 대기
  if (imageUrl) await new Promise((r) => setTimeout(r, 3000));
  // 2) 발행
  const r2 = await fetch(`${TH}/${creds.userId}/threads_publish`, { method: "POST", body: new URLSearchParams({ creation_id: d1.id, access_token: creds.token }) });
  const d2 = await r2.json();
  if (!r2.ok || !d2.id) throw new Error(`스레드 발행 실패: ${d2.error?.message ?? JSON.stringify(d2)}`);
  return d2.id as string;
}
