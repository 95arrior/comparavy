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
import { generateCardNews, assessCard, ANGLES } from "../lib/cardNews";
import { createSupabaseAdminClient } from "../lib/supabase-server";

const BUCKET = "social-cards";

// 초반엔 홍보(promo) 앵글 제외 — 순수 도움·이득·유머 위주
const ROTATION = ANGLES.filter((a) => !a.promo);

async function buildOne(admin: ReturnType<typeof createSupabaseAdminClient>, seq: number, avoid: string[]) {
  // 앵글을 순환시켜 골고루 섞는다
  const a = ROTATION[seq % ROTATION.length];
  const opts = { avoidTopics: avoid, useWebSearch: a.web, model: a.web ? "claude-sonnet-4-6" : undefined };

  // 품질 게이트 — 미달이면 1회 재생성, 그래도 안 되면 스킵
  let card = await generateCardNews(a.seed, a.label, opts);
  let check = assessCard(card);
  if (!check.ok) {
    card = await generateCardNews(a.seed, a.label, opts);
    check = assessCard(card);
  }
  if (!check.ok) return { skipped: true as const, label: a.label, reasons: check.reasons };

  const pngs = await renderCards(card.slides);
  const stamp = `${Date.now()}-${seq}`;
  const urls: string[] = [];
  for (let i = 0; i < pngs.length; i++) {
    const path = `${stamp}/${i}.png`;
    const { error } = await admin.storage.from(BUCKET).upload(path, pngs[i], { contentType: "image/png", upsert: true });
    if (error) throw new Error("업로드 실패: " + error.message);
    urls.push(admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  }
  const { error } = await admin.from("social_posts").insert({ type: "carousel", media_urls: urls, caption: card.caption, topic: a.seed });
  if (error) throw new Error("보관함 저장 실패: " + error.message);
  return { skipped: false as const, label: a.label, title: card.slides[0]?.title ?? "" };
}

async function main() {
  const n = Math.max(1, Math.min(50, Number(process.argv[2]) || 10));
  console.log(`🗂  카드뉴스 ${n}세트 벌크 생성 시작 (haiku · 유머는 sonnet+웹검색 · 품질 게이트 ON)`);
  const admin = createSupabaseAdminClient();
  await admin.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  // 최근 올린 주제 — 중복 회피용
  const { data: recent } = await admin.from("social_posts").select("topic").order("created_at", { ascending: false }).limit(20);
  const avoid: string[] = (recent ?? []).map((r: { topic: string | null }) => r.topic).filter((t): t is string => !!t);

  let ok = 0;
  for (let i = 0; i < n; i++) {
    try {
      const r = await buildOne(admin, i, avoid);
      if (r.skipped) {
        console.log(`  ⏭  ${i + 1}/${n} [${r.label}] 품질 미달로 스킵 (${r.reasons.join(", ")})`);
        continue;
      }
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
