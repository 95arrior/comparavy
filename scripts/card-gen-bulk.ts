/**
 * 카드뉴스 벌크 생성 — 다양한 앵글로 한 번에 N세트 만들어 보관함에 쌓아둔다.
 *
 * 사용:
 *   npm run card:gen:bulk -- 20     (20세트 생성)
 *   npm run card:gen:bulk           (기본 10세트)
 *
 * 앵글(주제 카테고리)을 골고루 섞어 중복을 줄인다. haiku라 한 세트당 비용은 1원 안팎.
 */
import { renderCards } from "../lib/cardRender";
import { generateCardNews, ANGLES } from "../lib/cardNews";
import { createSupabaseAdminClient } from "../lib/supabase-server";

const BUCKET = "social-cards";

async function buildOne(admin: ReturnType<typeof createSupabaseAdminClient>, seq: number) {
  // 앵글을 순환시켜 골고루 섞는다
  const a = ANGLES[seq % ANGLES.length];
  const card = await generateCardNews(a.seed, a.label);
  const pngs = await renderCards(card.slides);
  const stamp = `${Date.now()}-${seq}`;
  const urls: string[] = [];
  for (let i = 0; i < pngs.length; i++) {
    const path = `${stamp}/${i}.png`;
    const { error } = await admin.storage.from(BUCKET).upload(path, pngs[i], { contentType: "image/png", upsert: true });
    if (error) throw new Error("업로드 실패: " + error.message);
    urls.push(admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  }
  const { error } = await admin.from("social_posts").insert({ type: "carousel", media_urls: urls, caption: card.caption });
  if (error) throw new Error("보관함 저장 실패: " + error.message);
  return { label: a.label, title: card.slides[0]?.title ?? "" };
}

async function main() {
  const n = Math.max(1, Math.min(50, Number(process.argv[2]) || 10));
  console.log(`🗂  카드뉴스 ${n}세트 벌크 생성 시작 (모델: haiku)`);
  const admin = createSupabaseAdminClient();
  await admin.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  let ok = 0;
  for (let i = 0; i < n; i++) {
    try {
      const r = await buildOne(admin, i);
      ok++;
      console.log(`  ✅ ${i + 1}/${n} [${r.label}] ${r.title.replace(/\n/g, " ")}`);
    } catch (e) {
      console.log(`  ⚠️  ${i + 1}/${n} 실패: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`\n완료! ${ok}/${n}세트 보관함에 쌓였어요. 정해둔 하루 발행 수만큼 자동 게시됩니다.`);
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
