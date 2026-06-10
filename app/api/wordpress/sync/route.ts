import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { ensureUserRow } from "@/lib/userPlan";

/**
 * 워드프레스 상태를 우리 '내 글'로 동기화한다. (사용자가 WP에서 직접 내리거나 지운 것 반영)
 * - WP가 공개(publish) → 발행됨
 * - WP가 비공개(draft/pending) → 초안
 * - WP가 예약(future) → 예약됨
 * - WP에서 글이 사라짐(404) → 초안 + 워드프레스 연결정보(wp_post_id/link) 제거
 * (프로 전용)
 */
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 아직이에요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
  // futureOnly: 예약(future) 글만 검사 → 자동 동기화에 쓰는 가벼운 모드
  const reqBody = await request.json().catch(() => ({}));
  const futureOnly = reqBody?.futureOnly === true;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const planRow = await ensureUserRow(supabase, user.id);
  if (planRow.plan !== "pro") {
    return NextResponse.json({ error: "동기화는 프로 플랜 기능이에요.", upgrade: true }, { status: 403 });
  }

  const { data: conn } = await supabase
    .from("wordpress_connections")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!conn) return NextResponse.json({ error: "먼저 워드프레스를 연결해 주세요." }, { status: 400 });

  let q = supabase
    .from("articles")
    .select("id, status, wp_post_id")
    .eq("user_id", user.id)
    .not("wp_post_id", "is", null);
  if (futureOnly) q = q.eq("status", "future");
  const { data: arts } = await q.limit(200);

  const base = conn.site_url.replace(/\/+$/, "");
  const auth = "Basic " + Buffer.from(`${conn.username}:${conn.app_password}`).toString("base64");
  const admin = createSupabaseAdminClient();

  const changed: { id: string; status: string; clearedWp: boolean }[] = [];

  await Promise.all(
    (arts ?? []).map(async (a: { id: string; status: string; wp_post_id: number }) => {
      try {
        const r = await fetch(`${base}/wp-json/wp/v2/posts/${a.wp_post_id}?context=edit&_fields=status`, {
          headers: { Authorization: auth },
        });
        if (r.status === 404) {
          // WP에서 삭제됨 → 초안 + 연결정보 제거
          if (a.status !== "draft") {
            await admin.from("articles").update({ status: "draft", wp_post_id: null, wp_link: null }).eq("id", a.id);
            changed.push({ id: a.id, status: "draft", clearedWp: true });
          }
          return;
        }
        if (!r.ok) return;
        const wpStatus = (await r.json())?.status;
        const ours = wpStatus === "publish" ? "published" : wpStatus === "future" ? "future" : "draft";
        if (ours !== a.status) {
          await admin.from("articles").update({ status: ours }).eq("id", a.id);
          changed.push({ id: a.id, status: ours, clearedWp: false });
        }
      } catch {
        // 무시
      }
    }),
  );

  return NextResponse.json({ ok: true, changed });
}
