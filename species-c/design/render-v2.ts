// [species-c] v2 시안 렌더 — 더미 데이터 4종 1벌
import fs from "node:fs";
import path from "node:path";
import { reviewCardV2, ctaCardV2, judgeCardV2, productFrameV2 } from "./cardsV2";

async function main() {
  const out = path.join(__dirname, "../out/design-v2");
  fs.mkdirSync(out, { recursive: true });
  await reviewCardV2({ total: 3128, sample: 30, sat: [["건조가 잘 되고 금방 마른다", 21], ["냄새 제거·살균 효과", 14], ["소음이 적은 편", 9]], bad: [["향이나 초기 화학 냄새 부담", 5], ["완전 무음은 아님", 3]] }, path.join(out, "1_리뷰분석_v2.png"));
  await ctaCardV2({ name: "보아르 슈즈쏙 신발 건조기", price: 39800, orig: 45000, rating: 4.8, total: 3128, discountPct: 12 }, path.join(out, "2_CTA_v2.png"));
  await judgeCardV2({ fit: ["장마철 젖은 신발이 매일 생긴다면", "아이 실내화를 자주 빨아 신긴다면", "셀프 세탁 후 자연건조가 늦어 곤란하다면"], no: ["무음에 가까운 조용함이 필요하시다면", "부츠 전용 건조를 원하신다면"] }, path.join(out, "3_판정표_v2.png"));
  await productFrameV2(null, path.join(out, "4_대표이미지프레임_v2.png"));
  console.log("v2 시안 4장:", out);
}
main().catch((e) => { console.error(e); process.exit(1); });
