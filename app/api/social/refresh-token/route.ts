import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { refreshIgToken } from "@/lib/instagram";
import { refreshThreadsToken } from "@/lib/threads";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

// 인스타 장기 토큰 자동 갱신 (주 1회 cron). 60일 만료 전 갱신해 발행이 끊기지 않게 한다.
function authorized(req: Request): boolean {
  const auth = req.headers.get("authorization");
  const cron = process.env.CRON_SECRET;
  const social = process.env.SOCIAL_CRON_SECRET;
  return Boolean((cron && auth === `Bearer ${cron}`) || (social && auth === `Bearer ${social}`));
}

async function run() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, error: "서버 설정" }, { status: 500 });
  }
  const admin = createSupabaseAdminClient();
  const { data: s } = await admin.from("social_settings").select("ig_access_token,threads_access_token").eq("id", 1).maybeSingle();
  const result: Record<string, unknown> = {};

  // 인스타 토큰 갱신
  const igTok = (s?.ig_access_token ? decryptSecret(s.ig_access_token) : "") || process.env.IG_ACCESS_TOKEN;
  if (igTok) {
    try {
      const { token: next, expiresInSec } = await refreshIgToken(igTok);
      await admin.from("social_settings").update({ ig_access_token: encryptSecret(next), ig_token_expires_at: new Date(Date.now() + expiresInSec * 1000).toISOString(), ig_token_refreshed_at: new Date().toISOString() }).eq("id", 1);
      result.instagram = "refreshed";
    } catch (e) { result.instagram = e instanceof Error ? e.message : "실패"; }
  }

  // 스레드 토큰 갱신
  if (s?.threads_access_token) {
    try {
      const { token: next, expiresInSec } = await refreshThreadsToken(decryptSecret(s.threads_access_token));
      await admin.from("social_settings").update({ threads_access_token: encryptSecret(next), threads_token_expires_at: new Date(Date.now() + expiresInSec * 1000).toISOString() }).eq("id", 1);
      result.threads = "refreshed";
    } catch (e) { result.threads = e instanceof Error ? e.message : "실패"; }
  }

  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "권한이 없어요." }, { status: 401 });
  return run();
}
export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "권한이 없어요." }, { status: 401 });
  return run();
}
