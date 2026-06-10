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
import { generateCardNews, assessCard, ANGLES, type Angle } from "../lib/cardNews";
import { createSupabaseAdminClient } from "../lib/supabase-server";

const BUCKET = "social-cards";

async function main() {
  let topic = process.argv.slice(2).join(" ").trim();
  let angleLabel = "";
  let angle: Angle | undefined;
  if (!topic) {
    angle = ANGLES[Math.floor(Math.random() * ANGLES.length)];
    topic = angle.seed;
    angleLabel = angle.label;
    console.log(`🎲 주제 자동 선택: [${angle.label}] ${topic}`);
  }

  console.log("① 카피 생성 중…");
  // 품질 게이트 — 통과 못 하면 1회 재생성, 그래도 안 되면 중단(쓰레기 안 올림)
  let card = await generateCardNews(topic, angleLabel, { useWebSearch: angle?.web, model: angle?.web ? "claude-sonnet-4-6" : undefined });
  let check = assessCard(card);
  if (!check.ok) {
    console.log(`  ↻ 품질 미달(${check.reasons.join(", ")}) → 재생성`);
    card = await generateCardNews(topic, angleLabel, { useWebSearch: angle?.web, model: angle?.web ? "claude-sonnet-4-6" : undefined });
    check = assessCard(card);
  }
  if (!check.ok) {
    console.error(`❌ 품질 기준 미달로 중단: ${check.reasons.join(", ")}`);
    process.exit(1);
  }
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
  const { error } = await admin.from("social_posts").insert({ type: "carousel", media_urls: urls, caption: card.caption, topic });
  if (error) throw new Error("보관함 저장 실패: " + error.message);

  console.log(`\n✅ 완료! 카드뉴스 ${urls.length}장 보관함에 담겼어요.`);
  console.log("\n📝 캡션:\n" + card.caption);
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
