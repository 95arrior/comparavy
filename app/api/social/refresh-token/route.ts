import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { refreshIgToken } from "@/lib/instagram";
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
  const { data: s } = await admin.from("social_settings").select("ig_access_token").eq("id", 1).maybeSingle();
  const token = (s?.ig_access_token ? decryptSecret(s.ig_access_token) : "") || process.env.IG_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ ok: false, error: "갱신할 토큰이 없어요 (IG_ACCESS_TOKEN 또는 DB)" }, { status: 400 });

  try {
    const { token: next, expiresInSec } = await refreshIgToken(token);
    const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();
    await admin
      .from("social_settings")
      .update({ ig_access_token: encryptSecret(next), ig_token_expires_at: expiresAt, ig_token_refreshed_at: new Date().toISOString() })
      .eq("id", 1);
    return NextResponse.json({ ok: true, expiresAt });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "갱신 실패" }, { status: 502 });
  }
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "권한이 없어요." }, { status: 401 });
  return run();
}
export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "권한이 없어요." }, { status: 401 });
  return run();
}
