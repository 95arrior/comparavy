// 구글 애즈 API refresh token 발급기 (무설치, Node 내장 모듈만).
// 사용법:
//   GOOGLE_ADS_CLIENT_ID=xxx GOOGLE_ADS_CLIENT_SECRET=yyy node scripts/google-ads-refresh-token.mjs
// 실행하면 브라우저로 구글 로그인 → 동의 → refresh token이 터미널에 출력됩니다.
// (OAuth 클라이언트는 'Desktop app' 타입이어야 localhost 콜백이 허용됩니다.)

import http from "node:http";
import { exec } from "node:child_process";

const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const PORT = 5858;
const REDIRECT = `http://localhost:${PORT}`;
const SCOPE = "https://www.googleapis.com/auth/adwords";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌ GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET 환경변수를 넣어 실행하세요.");
  process.exit(1);
}

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent", // refresh token 강제 발급
  }).toString();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  const code = url.searchParams.get("code");
  if (!code) {
    res.writeHead(400).end("코드 없음");
    return;
  }
  try {
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT,
        grant_type: "authorization_code",
      }).toString(),
    });
    const data = await r.json();
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(
      "<h2>완료! 터미널을 확인하세요. 이 창은 닫아도 됩니다.</h2>",
    );
    if (data.refresh_token) {
      console.log("\n✅ refresh token 발급 성공:\n");
      console.log("GOOGLE_ADS_REFRESH_TOKEN=" + data.refresh_token + "\n");
    } else {
      console.error("\n❌ refresh token이 없습니다. 응답:", JSON.stringify(data, null, 2));
      console.error("→ OAuth 동의화면이 'In production'인지, prompt=consent인지 확인하세요.\n");
    }
  } catch (e) {
    console.error("토큰 교환 실패:", e);
  } finally {
    setTimeout(() => server.close(() => process.exit(0)), 500);
  }
});

server.listen(PORT, () => {
  console.log(`\n브라우저에서 아래 주소로 로그인·동의해 주세요(자동으로 열리지 않으면 복사):\n\n${authUrl}\n`);
  exec(`open "${authUrl}"`); // macOS 자동 열기
});
