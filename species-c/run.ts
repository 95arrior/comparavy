// [species-c] 진입점 — npx tsx species-c/run.ts species-c/inputs/<상품>.json
// 파이프라인: 인테이크 → 상품 게이트 → 키워드 실측 → 리뷰 마이닝 → 심리 브리프 → 본문 → 카드 → 품질 게이트 → 패키지 → 로그
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { writeArticle } from "./article";
import { buildBrief } from "./brief";
import { renderChecklistCard, renderCompareCard, renderCtaCard, renderReviewCard } from "./cards";
import { logPost } from "./db";
import { runQualityGate, checkTitleKeyword } from "./finalGate";
import { runProductGate } from "./gate";
import { intake } from "./intake";
import { discoverKeywords } from "./keywords";
import { writePackage } from "./package";
import { mineReviews, ReviewShortage } from "./reviews";
import type { ProductInput } from "./types";

function stepLog(step: string, detail: string): void {
  console.log(`\n[${step}] ${detail}`);
}

async function main(): Promise<void> {
  const inputPath = process.argv[2];
  if (!inputPath) { console.error("사용법: npx tsx species-c/run.ts species-c/inputs/<상품>.json"); process.exit(1); }
  const input = JSON.parse(fs.readFileSync(inputPath, "utf8")) as ProductInput;

  // ② 인테이크
  const { product, notes } = await intake(input);
  stepLog("인테이크", `${product.name} / ${product.price.toLocaleString()}원 / 평점 ${product.rating} / 리뷰 ${product.reviewCount.toLocaleString()}건 (${product.source})`);
  notes.forEach((n) => console.log(`  - ${n}`));

  // ③ 상품 게이트 (fail-closed)
  const gate = runProductGate(product);
  for (const c of gate.checks) console.log(`  ${c.pass ? "통과" : "실격"} | ${c.label} — ${c.detail}`);
  if (!gate.pass && !input.override) { console.error("\n상품 게이트 실격 — 글 생성 중단(무시하려면 입력에 \"override\": true)"); process.exit(2); }
  if (!gate.pass && input.override) console.warn("\n경고: 게이트 실격 상품을 override로 진행 중 — 판매왕 신뢰 자산이 깎일 수 있음");

  // ④ 키워드 발굴·실측
  const keywords = await discoverKeywords(product, Boolean(input.compareWith), gate.seasonScore);
  stepLog("키워드", `메인 "${keywords.main.keyword}" (${keywords.main.layer}) — 월 ${keywords.main.vol?.toLocaleString()}회 / 문서 ${keywords.main.blogTotal?.toLocaleString()}개 / 밴드 ${keywords.main.inBand ? "내" : "외(차선)"}`);
  keywords.subs.forEach((s) => console.log(`  서브: ${s.keyword} (월 ${s.vol?.toLocaleString()} / 문서 ${s.blogTotal?.toLocaleString()})`));
  console.log(`  글 유형: ${keywords.articleType}`);

  // ⑥ 리뷰 마이닝 (⑤ 브리프가 리뷰 신호를 쓰므로 먼저)
  let reviews;
  try {
    reviews = await mineReviews(product.reviewsText, product.name);
  } catch (e) {
    if (e instanceof ReviewShortage) { console.error(`\n리뷰 원료 부족 — ${e.message}\n(§6: 게이트 재확인으로 되돌림)`); process.exit(3); }
    throw e;
  }
  stepLog("리뷰 마이닝", `${reviews.totalParsed}건 분석 — 만족: ${reviews.satisfactionTop3.map((s) => s.point).join(" / ")}`);

  // ⑤ 심리 브리프
  const brief = await buildBrief(product, keywords, reviews);
  stepLog("심리 브리프", brief.scene);

  // 인용 상한 결정론 수리(실측: 재추첨으로 quote-count가 안 잡힘) — 4번째부터 따옴표 해제(내용 보존)
  const capQuotes = (body: string): string => {
    let n = 0;
    return body.replace(/"([^"\n]{1,80})"/g, (m, inner: string) => (++n <= 3 ? m : inner));
  };
  // ⑦+⑨ 본문 생성 + 품질 게이트 (실격 시 사유 주입 재생성 1회)
  let article = await writeArticle(product, keywords, brief, reviews);
  article.body = capQuotes(article.body);
  let quality = runQualityGate(article, product);
  const titleIssue = checkTitleKeyword(article.titleSearch, keywords.main.keyword);
  if (titleIssue) quality = { pass: false, issues: [...quality.issues, titleIssue] };
  if (!quality.pass) {
    stepLog("품질 게이트", `1차 실격 ${quality.issues.length}건 — 재생성`);
    quality.issues.forEach((i) => console.log(`  - [${i.rule}] ${i.detail}`));
    article = await writeArticle(product, keywords, brief, reviews); // 프롬프트가 규칙을 이미 담고 있어 재추첨로 통과 시도
    article.body = capQuotes(article.body);
    quality = runQualityGate(article, product);
    const t2 = checkTitleKeyword(article.titleSearch, keywords.main.keyword);
    if (t2) quality = { pass: false, issues: [...quality.issues, t2] };
  }
  stepLog("품질 게이트", quality.pass ? "전 규칙 통과" : `실격 ${quality.issues.length}건(패키지에 경고 동봉)`);
  quality.issues.forEach((i) => console.log(`  - [${i.rule}] ${i.detail}`));

  // ⑧ 이미지 카드
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "species-c-"));
  const cards: { file: string; kind: string }[] = [];
  const reviewPng = path.join(tmp, "review.png");
  await renderReviewCard(product, reviews, reviewPng);
  cards.push({ file: reviewPng, kind: "review" });
  const ctaPng = path.join(tmp, "cta.png");
  await renderCtaCard(product, ctaPng);
  cards.push({ file: ctaPng, kind: "cta" });
  const fit = reviews.buyContexts.slice(0, 3).map((b) => b.context);
  const no = reviews.complaintsTop2.map((c) => `${c.point} 이 민감하다면`);
  const checkPng = path.join(tmp, "checklist.png");
  await renderChecklistCard(fit.length ? fit : ["같은 문제를 겪고 있다면"], no.length ? no : ["기대치가 아주 높다면"], checkPng);
  cards.push({ file: checkPng, kind: "checklist" });
  // §7-3 비교형 — 두 상품의 '입력 실측값'만으로 비교표(임의 생성 금지)
  if (input.compareWith?.name && keywords.articleType === "compare") {
    const b = input.compareWith;
    const comparePng = path.join(tmp, "compare.png");
    await renderCompareCard([
      { label: "가격", a: `${product.price.toLocaleString()}원`, b: b.price ? `${b.price.toLocaleString()}원` : "확인 필요" },
      { label: "평점", a: String(product.rating), b: b.rating != null ? String(b.rating) : "확인 필요" },
      { label: "리뷰 수", a: product.reviewCount.toLocaleString(), b: b.reviewCount != null ? b.reviewCount.toLocaleString() : "확인 필요" },
    ], product.name, b.name, comparePng);
    cards.push({ file: comparePng, kind: "compare" });
  }
  stepLog("이미지 카드", `${cards.length}장 렌더링 완료`);

  // ⑩ 패키지 + 로그
  const outDir = writePackage({ product, gate, keywords, brief, article, cards, quality });
  logPost({ productName: product.name, productUrl: product.url, mainKeyword: keywords.main.keyword, monthlySearches: keywords.main.vol, blogTotal: keywords.main.blogTotal, articleType: keywords.articleType, gateResult: gate, qualityResult: quality, outDir });
  stepLog("완료", `복붙 패키지: ${outDir}`);
  console.log(`  제목(검색안): ${article.titleSearch}`);
  console.log(`  본문 ${[...article.body].length.toLocaleString()}자 / 태그 ${article.tags.length}개 / 카드 ${cards.length}장`);
}

main().catch((e) => { console.error("파이프라인 실패:", e instanceof Error ? e.message : e); process.exit(1); });
