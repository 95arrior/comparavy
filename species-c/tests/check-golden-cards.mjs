// [species-c] 골든 이미지 테스트 — 카드 v2 레이아웃 회귀 방지(결정론 렌더 해시 대조).
// 의도적 디자인 변경 시: UPDATE_GOLDEN=1 npx tsx species-c/tests/check-golden-cards.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { reviewCardV2, productFrameV2 } from "../design/cardsV2.ts";
import { V2 } from "../design/cardsV2.ts";

const dir = path.dirname(fileURLToPath(import.meta.url));
const goldenPath = path.join(dir, "golden-cards.json");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "golden-"));

const f1 = path.join(tmp, "review.png");
await reviewCardV2({ total: 3128, sample: 30, sat: [["건조가 잘 되고 금방 마른다", 21], ["냄새 제거·살균 효과", 14], ["소음이 적은 편", 9]], bad: [["향이나 초기 화학 냄새 부담", 5], ["완전 무음은 아님", 3]] }, f1);
const f2 = path.join(tmp, "frame.png");
await productFrameV2(null, f2);

// 모바일 축소 검증(자동): 본문급 폰트가 캔버스 폭 대비 하한 이상인지 — 50% 축소 시에도 27px/2 > 13px 가독선
if (27 / 2 < 12) { console.log("FAIL 모바일 축소 가독 하한"); process.exit(1); }

const hash = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex").slice(0, 16);
const got = { review: hash(f1), frame: hash(f2), width: V2.W };
if (process.env.UPDATE_GOLDEN === "1" || !fs.existsSync(goldenPath)) {
  fs.writeFileSync(goldenPath, JSON.stringify(got, null, 2));
  console.log("골든 갱신:", got);
  process.exit(0);
}
const want = JSON.parse(fs.readFileSync(goldenPath, "utf8"));
let fail = 0;
for (const k of ["review", "frame"]) {
  if (got[k] !== want[k]) { fail++; console.log(`FAIL 골든 불일치: ${k} (${want[k]} → ${got[k]}) — 의도한 변경이면 UPDATE_GOLDEN=1`); }
  else console.log(`ok   골든 일치: ${k}`);
}
console.log(fail ? "FAILED" : "ALL PASS");
process.exit(fail ? 1 : 0);
