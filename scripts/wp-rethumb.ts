// ★발행 완료 글의 대표 이미지 재생성(2026-07-29 유저 요청 — 문구 다양성 v4 이전에 나간 '가장 많이 ~' 4편 교체).
//  사용법:
//    npm run wp:rethumb -- --list                     발행 글 목록(대상 고르기)
//    npm run wp:rethumb -- --ids <id,id> --preview    새 문구만 미리보기(이미지·업로드 없음, 안전)
//    npm run wp:rethumb -- --ids <id,id> --apply      이미지 재생성 → WP 미디어 업로드 → 글 대표이미지 교체
//  --apply는 운영 WP 글을 실제로 고친다. GEMINI_API_KEY(또는 OPENAI_API_KEY)·WP_ENCRYPTION_KEY 필요 —
//  이미지 키가 없으면 일러스트 배경이 브랜드 단색으로 퇴화하므로 apply를 거부한다(현재보다 나빠지는 교체 방지).
import { createClient } from "@supabase/supabase-js";
import { autoFeaturedImage, wpThumbCopyFor } from "../lib/wpFeaturedImage";
import { decryptSecret } from "../lib/crypto";

const argv = process.argv.slice(2);
const has = (f: string) => argv.includes(f);
const val = (f: string) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] ?? "" : ""; };
const LIMIT = Number(val("--limit") || 12);
const IDS = val("--ids").split(",").map((s) => s.trim()).filter(Boolean);

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

interface Row { id: string; user_id: string; keyword: string | null; title: string | null; wp_post_id: number | null; wp_link: string | null; featured_image: string | null; publish_at: string | null; created_at: string }

async function rows(): Promise<Row[]> {
  let q = sb.from("articles").select("id, user_id, keyword, title, wp_post_id, wp_link, featured_image, publish_at, created_at").eq("status", "published").not("wp_post_id", "is", null);
  if (IDS.length) q = q.in("id", IDS);
  const { data, error } = await q.order("publish_at", { ascending: false }).limit(IDS.length || LIMIT);
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

/** WP 미디어 업로드 → 미디어 ID(대표 이미지 교체용). publishPost의 uploadMedia와 같은 규격. */
async function uploadMedia(dataUrl: string, creds: { siteUrl: string; username: string; appPassword: string }, name: string): Promise<number | null> {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  const buf = Buffer.from(m[2]!, "base64");
  const base = creds.siteUrl.replace(/\/+$/, "");
  const auth = Buffer.from(`${creds.username}:${creds.appPassword}`).toString("base64");
  const res = await fetch(`${base}/wp-json/wp/v2/media`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": m[1]!, "Content-Disposition": `attachment; filename="${name}.png"` },
    body: new Uint8Array(buf),
  });
  if (!res.ok) { console.error(`  ✗ 미디어 업로드 실패 ${res.status}: ${(await res.text()).slice(0, 160)}`); return null; }
  const j = (await res.json()) as { id?: number };
  return j.id ?? null;
}

async function main() {
  const list = await rows();
  if (!list.length) { console.log("대상 글이 없습니다."); return; }

  if (has("--list") || (!has("--preview") && !has("--apply"))) {
    for (const a of list) {
      console.log(`${String(a.publish_at ?? a.created_at).slice(0, 16)}  post=${a.wp_post_id}  대표이미지저장=${a.featured_image ? "있음" : "없음"}`);
      console.log(`  ${a.title}`);
      console.log(`  id=${a.id}  kw=${a.keyword}  ${a.wp_link ?? ""}\n`);
    }
    console.log(`총 ${list.length}편. 교체할 글의 id를 --ids 로 넘기세요(먼저 --preview 권장).`);
    return;
  }

  const apply = has("--apply");
  if (apply && !(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY)) {
    console.error("중단: 이미지 API 키가 없습니다(GEMINI_API_KEY 또는 OPENAI_API_KEY). 이대로 교체하면 일러스트 배경이 단색으로 퇴화합니다.\n  → vercel env pull .env.local 로 운영 키를 받아온 뒤 다시 실행하세요.");
    process.exit(1);
  }
  if (apply && !process.env.WP_ENCRYPTION_KEY) {
    console.error("중단: WP_ENCRYPTION_KEY가 없어 워드프레스 비밀번호를 복호화할 수 없습니다.");
    process.exit(1);
  }

  for (const a of list) {
    const title = String(a.title ?? ""), keyword = String(a.keyword ?? "");
    const copy = await wpThumbCopyFor(title, keyword, `${a.user_id}:${a.id}`);
    console.log(`\n■ ${title}`);
    console.log(`  새 문구: ${copy ?? "(LLM 실패 — 제목 규칙 추출로 폴백)"}`);
    if (!apply) continue;

    const { data: conn } = await sb.from("wordpress_connections").select("site_url, username, app_password").eq("user_id", a.user_id).maybeSingle();
    if (!conn) { console.error("  ✗ 워드프레스 연결 없음 — 건너뜀"); continue; }
    const { data: prof } = await sb.from("blog_profiles").select("blog_name").eq("user_id", a.user_id).maybeSingle();

    const png = await autoFeaturedImage(a.user_id, keyword, String((prof as { blog_name?: string } | null)?.blog_name ?? ""), a.id, { title });
    if (!png) { console.error("  ✗ 이미지 생성 실패 — 건너뜀(기존 대표 이미지 유지)"); continue; }

    const creds = { siteUrl: String(conn.site_url), username: String(conn.username), appPassword: decryptSecret(String(conn.app_password)) };
    const mediaId = await uploadMedia(png, creds, `thumb-${a.wp_post_id}`);
    if (!mediaId) continue;

    const auth = Buffer.from(`${creds.username}:${creds.appPassword}`).toString("base64");
    const res = await fetch(`${creds.siteUrl.replace(/\/+$/, "")}/wp-json/wp/v2/posts/${a.wp_post_id}`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ featured_media: mediaId }),
    });
    if (!res.ok) { console.error(`  ✗ 대표 이미지 교체 실패 ${res.status}: ${(await res.text()).slice(0, 160)}`); continue; }
    console.log(`  ✓ 교체 완료 (media=${mediaId}) ${a.wp_link ?? ""}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
