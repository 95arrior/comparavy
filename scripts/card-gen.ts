/**
 * 카드뉴스 자동 생성 CLI (로컬 Puppeteer 렌더 → Supabase 업로드 → 보관함 적재).
 *
 * 사용:
 *   npm run card:gen -- "블로그 글감 찾는 법"   (주제 지정)
 *   npm run card:gen                              (앵글 랜덤 자동 선택)
 *
 * 보관함에 쌓이면 Vercel cron이 설정한 시각에 자동 발행.
 */
import { renderCards } from "../lib/cardRender";
import { generateCardNews, ANGLES } from "../lib/cardNews";
import { createSupabaseAdminClient } from "../lib/supabase-server";

const BUCKET = "social-cards";

async function main() {
  let topic = process.argv.slice(2).join(" ").trim();
  let angleLabel = "";
  if (!topic) {
    const a = ANGLES[Math.floor(Math.random() * ANGLES.length)];
    topic = a.seed;
    angleLabel = a.label;
    console.log(`🎲 주제 자동 선택: [${a.label}] ${topic}`);
  }

  console.log("① 카피 생성 중…");
  const card = await generateCardNews(topic, angleLabel);
  console.log("  슬라이드: " + card.slides.map((s) => s.title).join(" / "));

  console.log("② 이미지 렌더 중… (Puppeteer, 처음엔 크로미움 받느라 느릴 수 있어요)");
  const pngs = await renderCards(card.slides);

  console.log("③ 업로드 중…");
  const admin = createSupabaseAdminClient();
  await admin.storage.createBucket(BUCKET, { public: true }).catch(() => {});
  const stamp = Date.now();
  const urls: string[] = [];
  for (let i = 0; i < pngs.length; i++) {
    const path = `${stamp}/${i}.png`;
    const { error } = await admin.storage.from(BUCKET).upload(path, pngs[i], { contentType: "image/png", upsert: true });
    if (error) throw new Error("업로드 실패: " + error.message);
    urls.push(admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  }

  console.log("④ 보관함에 적재…");
  const { error } = await admin.from("social_posts").insert({ type: "carousel", media_urls: urls, caption: card.caption });
  if (error) throw new Error("보관함 저장 실패: " + error.message);

  console.log(`\n✅ 완료! 카드뉴스 ${urls.length}장 보관함에 담겼어요.`);
  console.log("\n📝 캡션:\n" + card.caption);
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
