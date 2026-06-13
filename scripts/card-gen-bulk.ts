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
type Angle = (typeof ROTATION)[number];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

async function buildOne(admin: ReturnType<typeof createSupabaseAdminClient>, seq: number, a: Angle, avoid: string[]) {
  const opts = { avoidTopics: avoid, useWebSearch: a.web }; // 최신성 앵글(AI소식·유머)만 웹검색

  // 품질 게이트 — 최대 3회 재생성, 그래도 안 되면 스킵
  let card = await generateCardNews(a.seed, a.label, opts);
  let check = assessCard(card);
  for (let t = 0; t < 2 && !check.ok; t++) {
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
  const row = { type: "carousel", media_urls: urls, caption: card.caption, topic: a.seed, threads_text: card.threadsText };
  let { error } = await admin.from("social_posts").insert(row);
  if (error && /threads_text/.test(error.message)) {
    const { threads_text, ...rest } = row; void threads_text;
    ({ error } = await admin.from("social_posts").insert(rest));
  }
  if (error) throw new Error("보관함 저장 실패: " + error.message);
  return { skipped: false as const, label: a.label, title: card.slides[0]?.title ?? "" };
}

async function main() {
  const args = process.argv.slice(2);
  const admin = createSupabaseAdminClient();
  await admin.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  // --target N : 대기열을 N개까지 "채우기"(이미 있는 만큼 빼고 부족분만 생성). 삭제로 줄어든 만큼 자동 보충.
  // N (숫자만)  : 그냥 N개 생성.
  let n: number;
  const ti = args.indexOf("--target");
  if (ti !== -1) {
    const target = Math.max(1, Math.min(50, Number(args[ti + 1]) || 14));
    const { count } = await admin.from("social_posts").select("id", { count: "exact", head: true }).eq("status", "queued");
    n = Math.max(0, target - (count ?? 0));
    console.log(`🎯 목표 ${target}개 · 현재 대기 ${count ?? 0}개 → ${n}개 보충 생성`);
    if (n === 0) { console.log("이미 목표만큼 차 있어요. 생성 안 함."); return; }
  } else {
    n = Math.max(1, Math.min(50, Number(args[0]) || 10));
    console.log(`🗂  카드뉴스 ${n}세트 벌크 생성 시작`);
  }

  // 최근 올린 주제 — 중복 회피용
  const { data: recent } = await admin.from("social_posts").select("topic").order("created_at", { ascending: false }).limit(20);
  const avoid: string[] = (recent ?? []).map((r: { topic: string | null }) => r.topic).filter((t): t is string => !!t);

  // 앵글 순서 셔플(주제 골고루 섞이게)
  let bag = shuffle(ROTATION);
  let ok = 0;
  for (let i = 0; i < n; i++) {
    if (i % ROTATION.length === 0 && i > 0) bag = shuffle(ROTATION); // 한 바퀴마다 다시 셔플
    const a = bag[i % ROTATION.length];
    try {
      const r = await buildOne(admin, i, a, avoid);
      if (r.skipped) {
        console.log(`  ⏭  ${i + 1}/${n} [${r.label}] 품질 미달로 스킵 (${r.reasons.join(", ")})`);
        continue;
      }
      ok++;
      if (r.title) avoid.push(r.title.replace(/\n/g, " ")); // 이미 쓴 표지 후크 → 다음 카드에서 회피
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
