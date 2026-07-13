// [species-c] 진입점 — npx tsx species-c/run.ts species-c/inputs/<상품>.json
// 파이프라인: 인테이크 → 상품 게이트 → 키워드 실측 → 리뷰 마이닝 → 심리 브리프 → 본문 → 카드 → 품질 게이트 → 패키지 → 로그
import fs from "node:fs";
import { writeArticle } from "./article";
import { buildBrief } from "./brief";

import { logPost, saveKeywordCandidates } from "./db";
import { runQualityGate, checkTitleKeyword, checkTitleHook15, checkTitleSingleNeedle } from "./finalGate";
import { runProductGate } from "./gate";
import { intake } from "./intake";
import { discoverKeywords } from "./keywords";
import { writePackage } from "./package";
import { mineReviews, ReviewShortage } from "./reviews";
import type { ProductInput } from "./types";

function stepLog(step: string, detail: string): void {
  console.log(`\n[${step}] ${detail}`);
}

// ★B-1: 불만 → "이런 분은 다시 생각하세요" 독자 조건문("소음이 생각보다 큼" → "무음에 가까운 조용함이 필요하시다면")
async function rewriteComplaints(points: string[]): Promise<string[]> {
  if (!points.length) return ["기대치가 아주 높으신 분"];
  try {
    const { askJson } = await import("./llm");
    const out = await askJson<string[]>(
      `리뷰 불만 포인트를 '이런 분은 다시 생각하세요' 목록의 독자 조건문으로 재작성하라. 각각 "~하시다면/~가 필요하시다면/~이 신경 쓰이신다면" 꼴의 자연스러운 한 구절(20자 이내), 이모지·과장 금지.\n예: "소음이 생각보다 큼" → "무음에 가까운 조용함이 필요하시다면"\n입력: ${JSON.stringify(points)}\nJSON 배열만 출력.`,
      1500,
    );
    const clean = out.map((t) => String(t).trim()).filter((t) => t && [...t].length <= 26 && !/[\u{1F000}-\u{1FAFF}✅✔]/u.test(t));
    return clean.length ? clean.slice(0, 2) : ["기대치가 아주 높으신 분"];
  } catch { return ["기대치가 아주 높으신 분"]; }
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
  const badge = (c: { golden: boolean; goldBadge: boolean }) => (c.golden ? " ★황금" : "") + (c.goldBadge ? " [골드]" : "");
  stepLog("키워드", `메인 "${keywords.main.keyword}" (${keywords.main.layer}·${keywords.main.source})${badge(keywords.main)} — 월 ${keywords.main.vol?.toLocaleString()}회 / 문서 ${keywords.main.blogTotal?.toLocaleString()}개 / 밴드 ${keywords.main.inBand ? "내" : "외(차선)"}`);
  keywords.subs.forEach((s) => console.log(`  서브: ${s.keyword} (${s.source})${badge(s)} — 월 ${s.vol?.toLocaleString()} / 문서 ${s.blogTotal?.toLocaleString()}`));
  const goldenAll = keywords.all.filter((c) => c.golden);
  if (goldenAll.length) console.log(`  ★황금 발굴 ${goldenAll.length}개: ${goldenAll.slice(0, 5).map((c) => c.keyword).join(" / ")}`);
  console.log(`  글 유형: ${keywords.articleType}`);

  // ⑥ 리뷰 마이닝 (⑤ 브리프가 리뷰 신호를 쓰므로 먼저)
  let reviews;
  try {
    reviews = await mineReviews(product.reviewsText, product.name);
  } catch (e) {
    if (e instanceof ReviewShortage) { console.error(`\n리뷰 원료 부족 — ${e.message}\n(§6: 게이트 재확인으로 되돌림)`); process.exit(3); }
    throw e;
  }
  stepLog("리뷰 마이닝", `표본 ${reviews.sampleSize}건(코드 실측) · 부정 ${reviews.negativeCount}건 — 만족: ${reviews.satisfactionTop3.map((s) => s.point).join(" / ")}`);
  if (reviews.negativeCount === 0) console.warn("  경고: 부정(별점 1~3) 리뷰 0건 — 낮은 평점 리뷰를 추가하면 단점 분석·신뢰도가 올라갑니다(권장 표본: 최신순 20건 + 평점 낮은순 10건)");

  // ⑤ 심리 브리프
  // 1b: 리뷰 유래 검색어 씨앗 적재(다음 글감 후보 — keyword_candidates)
  if (reviews.searchPhrases?.length) {
    try {
      saveKeywordCandidates(reviews.searchPhrases.map((kw) => ({ source: "review", productName: product.name, keyword: kw })));
      console.log(`  리뷰 유래 씨앗 ${reviews.searchPhrases.length}개 적재(keyword_candidates)`);
    } catch { /* 적재 실패 무해 */ }
  }
  const brief = await buildBrief(product, keywords, reviews);
  stepLog("심리 브리프", brief.scene);

  // 인용 상한 결정론 수리(실측: 재추첨으로 quote-count가 안 잡힘) — 4번째부터 따옴표 해제(내용 보존)
  const capQuotes = (body: string): string => {
    let n = 0; // v2: 도입 속마음 대사 1회 + 리뷰 인용 3회 = 총 4회까지, 초과는 따옴표 해제
    return body.replace(/"([^"\n]{1,80})"/g, (m, inner: string) => (++n <= 4 ? m : inner));
  };
  // ⑦+⑨ 본문 생성 + 품질 게이트 (실격 시 사유 주입 재생성 1회)
  let article = await writeArticle(product, keywords, brief, reviews);
  article.body = capQuotes(article.body);
  const mining = { sampleSize: reviews.sampleSize, totalReviews: product.reviewCount };
  const titleIssues = (t: string) => [checkTitleKeyword(t, keywords.main.keyword), checkTitleHook15(t), checkTitleSingleNeedle(t, keywords.subs.map((s) => s.keyword))].filter((x): x is NonNullable<typeof x> => x != null);
  let quality = runQualityGate(article, product, mining);
  quality = { pass: quality.pass && titleIssues(article.titleSearch).length === 0, issues: [...quality.issues, ...titleIssues(article.titleSearch)] };
  if (!quality.pass) {
    stepLog("품질 게이트", `1차 실격 ${quality.issues.length}건 — 재생성`);
    quality.issues.forEach((i) => console.log(`  - [${i.rule}] ${i.detail}`));
    article = await writeArticle(product, keywords, brief, reviews); // 프롬프트가 규칙을 이미 담고 있어 재추첨로 통과 시도
    article.body = capQuotes(article.body);
    quality = runQualityGate(article, product, mining);
    quality = { pass: quality.pass && titleIssues(article.titleSearch).length === 0, issues: [...quality.issues, ...titleIssues(article.titleSearch)] };
  }
  stepLog("품질 게이트", quality.pass ? "전 규칙 통과" : `실격 ${quality.issues.length}건(패키지에 경고 동봉)`);
  quality.issues.forEach((i) => console.log(`  - [${i.rule}] ${i.detail}`));

  // ⑧ 이미지 생성 없음(유저 확정: 리뷰 카드 폐지) — [상품 이미지] 3~5곳(수동)·링크 2곳만
  const cards: { file: string; kind: string }[] = [];
  stepLog("이미지", "생성 없음 — [상품 이미지] 3~5곳은 상품 페이지 이미지 업로드, 링크 2곳");

  // ⑩ 패키지 + 로그
  const outDir = writePackage({ product, gate, keywords, brief, article, cards, quality });
  logPost({ productName: product.name, productUrl: product.url, mainKeyword: keywords.main.keyword, monthlySearches: keywords.main.vol, blogTotal: keywords.main.blogTotal, articleType: keywords.articleType, gateResult: gate, qualityResult: quality, outDir });
  stepLog("완료", `복붙 패키지: ${outDir}`);
  console.log(`  제목(검색안): ${article.titleSearch}`);
  console.log(`  본문 ${[...article.body].length.toLocaleString()}자 / 태그 ${article.tags.length}개 / 카드 ${cards.length}장`);
}

main().catch((e) => { console.error("파이프라인 실패:", e instanceof Error ? e.message : e); process.exit(1); });
